import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { getDayOfWeekInSaoPaulo, getDateInSaoPaulo, formatTimeInSaoPaulo, SAO_PAULO_OFFSET } from '@/lib/utils';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];
type AppointmentStatus = Database['public']['Enums']['appointment_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

export interface AppointmentServiceRelation {
  id: string;
  service_id: string;
  employee_id: string;
  price: number;
  duration: number;
  sort_order: number;
  services?: { id: string; name: string; price: number; duration: number } | null;
  employees?: { id: string; name: string } | null;
}

export interface AppointmentWithRelations extends Appointment {
  clients?: { id: string; name: string; phone: string | null; email: string | null } | null;
  employees?: { id: string; name: string } | null;
  services?: { id: string; name: string; price: number; duration: number } | null;
  appointment_services?: AppointmentServiceRelation[];
}

export function useAppointments() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Filtrar agendamentos dos últimos 30 dias até o futuro para performance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (id, name, phone, email),
          employees (id, name),
          services (id, name, price, duration),
          appointment_services (id, service_id, employee_id, price, duration, sort_order, services:service_id (id, name, price, duration), employees:employee_id (id, name))
        `)
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', thirtyDaysAgo.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(500);

      if (error) throw error;
      return data as AppointmentWithRelations[];
    },
    enabled: !!tenantId,
  });

  // Validate if employee can perform the service (single - backward compat)
  const validateEmployeeService = async (employeeId: string, serviceId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('employee_services')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  };

  // Validate if employee can perform ALL services
  const validateEmployeeServices = async (employeeId: string, serviceIds: string[]): Promise<boolean> => {
    const { data, error } = await supabase
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeId)
      .in('service_id', serviceIds);

    if (error) throw error;
    const validIds = new Set(data?.map(es => es.service_id) || []);
    return serviceIds.every(id => validIds.has(id));
  };

  // Mapeamento de dias em português para inglês
  const dayMappingPtToEn: Record<string, string> = {
    'dom': 'sunday',
    'seg': 'monday',
    'ter': 'tuesday',
    'qua': 'wednesday',
    'qui': 'thursday',
    'sex': 'friday',
    'sab': 'saturday'
  };

  // Normaliza working_hours para formato padrão (inglês)
  const normalizeWorkingHours = (workingHours: unknown): Record<string, { open: string; close: string; isOpen: boolean }> | null => {
    if (!workingHours || typeof workingHours !== 'object') {
      return null;
    }

    const wh = workingHours as Record<string, unknown>;
    const normalized: Record<string, { open: string; close: string; isOpen: boolean }> = {};

    for (const [key, value] of Object.entries(wh)) {
      if (!value || typeof value !== 'object') continue;

      const dayData = value as Record<string, unknown>;

      // Determina o nome do dia em inglês
      const dayName = dayMappingPtToEn[key.toLowerCase()] || key.toLowerCase();

      // Detecta formato: PT-BR usa 'enabled/start/end', EN usa 'isOpen/open/close'
      const isPortugueseFormat = 'enabled' in dayData || 'start' in dayData;

      if (isPortugueseFormat) {
        normalized[dayName] = {
          isOpen: Boolean(dayData.enabled),
          open: String(dayData.start || '09:00'),
          close: String(dayData.end || '18:00')
        };
      } else {
        normalized[dayName] = {
          isOpen: Boolean(dayData.isOpen),
          open: String(dayData.open || '09:00'),
          close: String(dayData.close || '18:00')
        };
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  };

  // Day names for working hours lookup
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Validate if employee works on the given day and time
  const validateEmployeeWorkingDay = async (
    employeeId: string,
    scheduledAt: string,
    duration: number
  ): Promise<void> => {
    // Fetch employee's working hours
    const { data: employee, error } = await supabase
      .from('employees')
      .select('name, working_hours')
      .eq('id', employeeId)
      .single();

    if (error) throw error;
    if (!employee) throw new Error('Profissional não encontrado.');

    // Normaliza working_hours para formato padrão (inglês)
    const workingHours = normalizeWorkingHours(employee.working_hours);

    if (!workingHours) {
      // No working hours configured - assume available
      return;
    }

    const appointmentDate = new Date(scheduledAt);
    // Use São Paulo timezone to determine day of week
    const dayIndex = getDayOfWeekInSaoPaulo(appointmentDate);
    const dayOfWeek = dayNames[dayIndex];
    const daySchedule = workingHours[dayOfWeek];

    // Check if employee works on this day
    if (!daySchedule || !daySchedule.isOpen) {
      const dayLabels: Record<string, string> = {
        sunday: 'domingo',
        monday: 'segunda-feira',
        tuesday: 'terça-feira',
        wednesday: 'quarta-feira',
        thursday: 'quinta-feira',
        friday: 'sexta-feira',
        saturday: 'sábado',
      };
      throw new Error(`${employee.name} não trabalha ${dayLabels[dayOfWeek]}. Selecione outro dia.`);
    }

    // Check if time is within working hours (using São Paulo time)
    const appointmentTime = formatTimeInSaoPaulo(appointmentDate);
    const appointmentEndTime = new Date(appointmentDate.getTime() + duration * 60000);
    const endTimeStr = formatTimeInSaoPaulo(appointmentEndTime);

    if (appointmentTime < daySchedule.open || endTimeStr > daySchedule.close) {
      throw new Error(`${employee.name} só atende das ${daySchedule.open} às ${daySchedule.close} neste dia. Selecione outro horário.`);
    }
  };

  // Validate time conflict for employee
  const validateTimeConflict = async (
    employeeId: string,
    scheduledAt: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<void> => {
    const appointmentDate = new Date(scheduledAt);
    // Get date in São Paulo timezone for accurate day filtering
    const dateStr = getDateInSaoPaulo(appointmentDate);
    // Use São Paulo timezone offset for date range queries
    const startOfDayStr = `${dateStr}T00:00:00${SAO_PAULO_OFFSET}`;
    const endOfDayStr = `${dateStr}T23:59:59${SAO_PAULO_OFFSET}`;

    // Fetch all appointments for this employee on this date
    let query = supabase
      .from('appointments')
      .select('id, scheduled_at, duration, status')
      .eq('employee_id', employeeId)
      .gte('scheduled_at', startOfDayStr)
      .lte('scheduled_at', endOfDayStr)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: existingAppointments, error } = await query;

    if (error) throw error;

    const newStart = appointmentDate.getTime();
    const newEnd = newStart + duration * 60000;

    for (const existing of existingAppointments || []) {
      const existingStart = new Date(existing.scheduled_at).getTime();
      const existingEnd = existingStart + existing.duration * 60000;

      // Check for overlap: (newStart < existingEnd) AND (newEnd > existingStart)
      if (newStart < existingEnd && newEnd > existingStart) {
        const existingStartTime = formatTimeInSaoPaulo(existing.scheduled_at);
        const existingEndTime = formatTimeInSaoPaulo(new Date(existingEnd));
        throw new Error(`O profissional já possui um agendamento das ${existingStartTime} às ${existingEndTime}. Selecione outro horário.`);
      }
    }
  };

  const addAppointment = useMutation({
    mutationFn: async (appointment: Omit<AppointmentInsert, 'tenant_id'> & {
      service_ids?: string[];
      service_employees?: Record<string, string>; // service_id -> employee_id
    }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      // Determine service IDs list (new format or legacy)
      const serviceIds = appointment.service_ids && appointment.service_ids.length > 0
        ? appointment.service_ids
        : appointment.service_id
          ? [appointment.service_id]
          : [];

      if (serviceIds.length === 0) {
        throw new Error('Selecione pelo menos um serviço.');
      }

      // Build service-employee mapping
      const serviceEmployees = appointment.service_employees || {};

      // If no per-service employees, fall back to global employee_id
      if (Object.keys(serviceEmployees).length === 0 && appointment.employee_id) {
        serviceIds.forEach(sId => { serviceEmployees[sId] = appointment.employee_id!; });
      }

      // Validate all services have an employee assigned
      const missingEmployee = serviceIds.find(sId => !serviceEmployees[sId]);
      if (missingEmployee) {
        throw new Error('Selecione um profissional para cada serviço.');
      }

      // Get unique employee IDs
      const uniqueEmployeeIds = [...new Set(Object.values(serviceEmployees))];

      // Validate each employee can perform their assigned service
      for (const [svcId, empId] of Object.entries(serviceEmployees)) {
        const canPerform = await validateEmployeeService(empId, svcId);
        if (!canPerform) {
          throw new Error('Um dos profissionais selecionados não executa o serviço atribuído.');
        }
      }

      // Fetch services to calculate totals
      const { data: servicesData, error: svcError } = await supabase
        .from('services')
        .select('id, name, price, duration')
        .in('id', serviceIds);

      if (svcError || !servicesData || servicesData.length !== serviceIds.length) {
        throw new Error('Erro ao buscar serviços selecionados.');
      }

      const totalDuration = servicesData.reduce((sum, s) => sum + s.duration, 0);
      const totalPrice = servicesData.reduce((sum, s) => sum + Number(s.price), 0);

      // Validate each unique employee works on this day/time and has no conflicts
      for (const empId of uniqueEmployeeIds) {
        await validateEmployeeWorkingDay(empId, appointment.scheduled_at, totalDuration);
        await validateTimeConflict(empId, appointment.scheduled_at, totalDuration);
      }

      // Remove extra fields from the insert payload (not DB columns)
      const { service_ids: _sids, service_employees: _se, ...appointmentData } = appointment;

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          tenant_id: tenantId,
          created_by: user?.id,
          employee_id: uniqueEmployeeIds[0], // Backward compatibility: first employee
          service_id: serviceIds[0], // Backward compatibility
          duration: totalDuration,
          price: totalPrice,
        })
        .select(`
          *,
          clients (id, name, phone, email, is_lead),
          employees (id, name),
          services (id, name, price, duration)
        `)
        .single();

      if (error) throw error;

      // Insert appointment_services with per-service employee
      const appointmentServicesData = servicesData.map((svc, index) => ({
        appointment_id: data.id,
        service_id: svc.id,
        employee_id: serviceEmployees[svc.id],
        price: Number(svc.price),
        duration: svc.duration,
        sort_order: index,
      }));

      const { error: asError } = await supabase
        .from('appointment_services')
        .insert(appointmentServicesData);

      if (asError) {
        // Rollback
        await supabase.from('appointments').delete().eq('id', data.id);
        throw new Error('Erro ao vincular serviços ao agendamento.');
      }

      // Update client: promote lead to client, increment total_visits, update last_visit
      if (appointment.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('total_visits, is_lead')
          .eq('id', appointment.client_id)
          .single();

        const updates: Record<string, unknown> = {
          total_visits: (clientData?.total_visits || 0) + 1,
          last_visit: appointment.scheduled_at,
        };

        if (clientData?.is_lead) {
          updates.is_lead = false;
        }

        await supabase
          .from('clients')
          .update(updates)
          .eq('id', appointment.client_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, service_ids, service_employees, ...updates }: AppointmentUpdate & {
      id: string;
      service_ids?: string[];
      service_employees?: Record<string, string>;
    }) => {
      // If service_ids are provided, recalculate totals and update appointment_services
      if (service_ids && service_ids.length > 0) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, price, duration')
          .in('id', service_ids);

        if (servicesData && servicesData.length > 0) {
          updates.duration = servicesData.reduce((sum, s) => sum + s.duration, 0);
          updates.price = servicesData.reduce((sum, s) => sum + Number(s.price), 0);
          updates.service_id = service_ids[0]; // Backward compat

          // Set primary employee to first service's employee
          const empMap = service_employees || {};
          const firstEmpId = empMap[service_ids[0]] || updates.employee_id;
          if (firstEmpId) {
            updates.employee_id = firstEmpId;
          }

          // Delete old appointment_services and insert new ones
          await supabase
            .from('appointment_services')
            .delete()
            .eq('appointment_id', id);

          const newAppointmentServices = servicesData.map((svc, index) => ({
            appointment_id: id,
            service_id: svc.id,
            employee_id: empMap[svc.id] || updates.employee_id,
            price: Number(svc.price),
            duration: svc.duration,
            sort_order: index,
          }));

          await supabase
            .from('appointment_services')
            .insert(newAppointmentServices);
        }
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          clients (id, name, phone, email),
          employees (id, name),
          services (id, name, price, duration),
          appointment_services (id, service_id, employee_id, price, duration, sort_order, services:service_id (id, name, price, duration), employees:employee_id (id, name))
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      toast.success('Agendamento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    },
  });

  // Mark as completed and create financial entry
  const markAsCompleted = useMutation({
    mutationFn: async ({ appointmentId, price }: { appointmentId: string; price: number }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      // Check if already completed
      const { data: existing } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointmentId)
        .single();

      if (existing?.status === 'completed') {
        throw new Error('Este agendamento já está concluído.');
      }

      // Check if financial entry already exists for this appointment
      const { data: existingEntry } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('type', 'income')
        .maybeSingle();

      if (existingEntry) {
        throw new Error('Já existe uma receita vinculada a este agendamento.');
      }

      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'completed', payment_status: 'paid' })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Create financial entry
      const { error: entryError } = await supabase
        .from('financial_entries')
        .insert({
          tenant_id: tenantId,
          type: 'income',
          category: 'Serviço',
          description: 'Receita de agendamento concluído',
          amount: price,
          appointment_id: appointmentId,
          created_by: user?.id,
        });

      if (entryError) throw entryError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries', tenantId] });
      toast.success('Agendamento concluído e receita registrada!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, payment_status }: { id: string; status: AppointmentStatus; payment_status?: PaymentStatus }) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      // Get current appointment with price info to check status change
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('status, client_id, price, services(name), appointment_services(services:service_id(name))')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const wasCompleted = currentAppointment?.status === 'completed';
      const willBeCompleted = status === 'completed';

      // Determine payment_status based on status change
      const updates: AppointmentUpdate = { status };
      if (willBeCompleted) {
        updates.payment_status = 'paid';
      } else if (wasCompleted && !willBeCompleted) {
        // Reverting from completed - set back to pending
        updates.payment_status = 'pending';
      } else if (payment_status) {
        updates.payment_status = payment_status;
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle financial entry based on status change
      if (wasCompleted && !willBeCompleted) {
        // REVERTING from completed - delete associated financial entry
        await supabase
          .from('financial_entries')
          .delete()
          .eq('appointment_id', id)
          .eq('type', 'income');
      } else if (!wasCompleted && willBeCompleted) {
        // BECOMING completed - create financial entry if doesn't exist
        const { data: existingEntry } = await supabase
          .from('financial_entries')
          .select('id')
          .eq('appointment_id', id)
          .eq('type', 'income')
          .maybeSingle();

        if (!existingEntry) {
          const price = Number(currentAppointment?.price || 0);
          const appointmentSvcs = currentAppointment?.appointment_services as { services?: { name: string } }[] | null;
          const serviceName = appointmentSvcs && appointmentSvcs.length > 0
            ? appointmentSvcs.map(as => as.services?.name).filter(Boolean).join(', ')
            : (currentAppointment?.services as { name: string } | null)?.name || 'Serviço';

          await supabase
            .from('financial_entries')
            .insert({
              tenant_id: tenantId,
              type: 'income',
              category: 'Serviços',
              description: `Receita: ${serviceName}`,
              amount: price,
              appointment_id: id,
              created_by: user?.id,
            });
        }
      }

      // If cancelling an appointment that wasn't already cancelled, update client stats
      if (status === 'cancelled' && currentAppointment?.status !== 'cancelled' && currentAppointment?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('total_visits')
          .eq('id', currentAppointment.client_id)
          .single();

        const newTotalVisits = Math.max(0, (clientData?.total_visits || 1) - 1);

        const clientUpdates: Record<string, unknown> = {
          total_visits: newTotalVisits,
        };

        // If no more visits, convert back to lead
        if (newTotalVisits === 0) {
          clientUpdates.is_lead = true;
          clientUpdates.last_visit = null;
        }

        await supabase
          .from('clients')
          .update(clientUpdates)
          .eq('id', currentAppointment.client_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      // Get appointment details before deleting
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('client_id, status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // If the appointment wasn't cancelled, update client stats
      if (appointment?.client_id && appointment?.status !== 'cancelled') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('total_visits')
          .eq('id', appointment.client_id)
          .single();

        const newTotalVisits = Math.max(0, (clientData?.total_visits || 1) - 1);

        const clientUpdates: Record<string, unknown> = {
          total_visits: newTotalVisits,
        };

        // If no more visits, convert back to lead
        if (newTotalVisits === 0) {
          clientUpdates.is_lead = true;
          clientUpdates.last_visit = null;
        }

        await supabase
          .from('clients')
          .update(clientUpdates)
          .eq('id', appointment.client_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir agendamento: ' + error.message);
    },
  });

  return {
    appointments,
    isLoading,
    error,
    addAppointment,
    updateAppointment,
    updateStatus,
    markAsCompleted,
    deleteAppointment,
    validateEmployeeService,
    validateEmployeeServices,
  };
}
