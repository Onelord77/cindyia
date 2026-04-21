import { useState, useMemo, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MobileCard } from '@/components/ui/mobile-card';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Plus, MoreVertical, Edit, Calendar, X, Loader2, CheckCircle } from 'lucide-react';
import { cn, toSaoPauloDateTime, createSaoPauloDate, formatTimeInSaoPaulo, getTodayInSaoPaulo, getDateInSaoPaulo } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useEmployeeServicesBulk } from '@/hooks/useEmployeeServices';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ClientQuickCreateDialog } from '@/components/appointments/ClientQuickCreateDialog';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppointmentStatus = Database['public']['Enums']['appointment_status'];

const statusConfig: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Pendente', class: 'status-pending' },
  confirmed: { label: 'Confirmado', class: 'status-confirmed' },
  completed: { label: 'Concluído', class: 'status-completed' },
  cancelled: { label: 'Cancelado', class: 'status-cancelled' },
  no_show: { label: 'Não compareceu', class: 'status-cancelled' },
};

const paymentConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-warning/10 text-warning' },
  paid: { label: 'Pago', class: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelado', class: 'bg-destructive/10 text-destructive' },
  refunded: { label: 'Reembolsado', class: 'bg-muted text-muted-foreground' },
};

const Agendamentos = () => {
  const isMobile = useIsMobile();
  const { appointments, isLoading, addAppointment, updateAppointment, updateStatus, markAsCompleted, deleteAppointment } = useAppointments();
  const { clients } = useClients();
  const { employees } = useEmployees();
  const { services } = useServices();

  // Get employee services for validation
  const employeeIds = employees.map(e => e.id);
  const { data: employeeServicesMap = {} } = useEmployeeServicesBulk(employeeIds);

  // Memoize active services to avoid filtering on every render
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    service_ids: [] as string[],
    service_employees: {} as Record<string, string>, // service_id -> employee_id
    date: getTodayInSaoPaulo(),
    time: '09:00',
  });

  const [editFormData, setEditFormData] = useState({
    client_id: '',
    service_ids: [] as string[],
    service_employees: {} as Record<string, string>, // service_id -> employee_id
    date: '',
    time: '',
  });

  // Get employees that can perform a specific service
  const getEmployeesForService = useMemo(() => {
    return (serviceId: string) => {
      return employees.filter(e => {
        if (!e.is_active) return false;
        const empServices = employeeServicesMap[e.id] || [];
        return empServices.some(es => es.serviceId === serviceId);
      });
    };
  }, [employees, employeeServicesMap]);

  // Calculate totals for selected services (create form)
  const selectedServicesTotals = useMemo(() => {
    const selectedSvcs = activeServices.filter(s => formData.service_ids.includes(s.id));
    return {
      duration: selectedSvcs.reduce((sum, s) => sum + s.duration, 0),
      price: selectedSvcs.reduce((sum, s) => sum + Number(s.price), 0),
    };
  }, [formData.service_ids, activeServices]);

  // Calculate totals for selected services (edit form)
  const editServicesTotals = useMemo(() => {
    const selectedSvcs = activeServices.filter(s => editFormData.service_ids.includes(s.id));
    return {
      duration: selectedSvcs.reduce((sum, s) => sum + s.duration, 0),
      price: selectedSvcs.reduce((sum, s) => sum + Number(s.price), 0),
    };
  }, [editFormData.service_ids, activeServices]);

  // Clean up service_employees when services are unchecked
  useEffect(() => {
    setFormData(prev => {
      const cleaned = { ...prev.service_employees };
      Object.keys(cleaned).forEach(sId => {
        if (!prev.service_ids.includes(sId)) delete cleaned[sId];
      });
      return { ...prev, service_employees: cleaned };
    });
  }, [formData.service_ids]);

  useEffect(() => {
    setEditFormData(prev => {
      const cleaned = { ...prev.service_employees };
      Object.keys(cleaned).forEach(sId => {
        if (!prev.service_ids.includes(sId)) delete cleaned[sId];
      });
      return { ...prev, service_employees: cleaned };
    });
  }, [editFormData.service_ids]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const serviceNames = appointment.appointment_services && appointment.appointment_services.length > 0
        ? appointment.appointment_services.map(as => as.services?.name || '').join(' ')
        : appointment.services?.name || '';
      const matchesSearch =
        appointment.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serviceNames.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      
      if (dateRange?.from && dateRange?.to) {
        const appointmentDate = new Date(appointment.scheduled_at);
        const isInRange = isWithinInterval(appointmentDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
        return matchesSearch && matchesStatus && isInRange;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchTerm, statusFilter, dateRange]);

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_ids: [],
      service_employees: {},
      date: getTodayInSaoPaulo(),
      time: '09:00',
    });
  };

  const handleSave = async () => {
    // Validate required fields with specific messages
    if (!formData.client_id) {
      toast.error('Selecione um cliente para criar o agendamento.');
      return;
    }
    if (formData.service_ids.length === 0) {
      toast.error('Selecione pelo menos um serviço para criar o agendamento.');
      return;
    }

    // Validate each service has an employee assigned
    const missingEmployee = formData.service_ids.find(sId => !formData.service_employees[sId]);
    if (missingEmployee) {
      const svc = activeServices.find(s => s.id === missingEmployee);
      toast.error(`Selecione um profissional para o serviço "${svc?.name || 'selecionado'}".`);
      return;
    }

    // Validate each employee can perform their assigned service (frontend validation)
    for (const [svcId, empId] of Object.entries(formData.service_employees)) {
      const empServices = employeeServicesMap[empId] || [];
      if (!empServices.some(es => es.serviceId === svcId)) {
        const svc = activeServices.find(s => s.id === svcId);
        const emp = employees.find(e => e.id === empId);
        toast.error(`${emp?.name || 'Profissional'} não executa o serviço "${svc?.name || ''}".`);
        return;
      }
    }

    const scheduledAt = createSaoPauloDate(formData.date, formData.time);
    const duration = selectedServicesTotals.duration || 30;

    // Validate working day/time for each unique employee
    const uniqueEmployeeIds = [...new Set(Object.values(formData.service_employees))];
    const dayKeysPt = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const dayLabelsPt: Record<string, string> = {
      dom: 'domingo', seg: 'segunda-feira', ter: 'terça-feira', qua: 'quarta-feira',
      qui: 'quinta-feira', sex: 'sexta-feira', sab: 'sábado',
    };

    for (const empId of uniqueEmployeeIds) {
      const selectedEmployee = employees.find(e => e.id === empId);
      if (selectedEmployee?.working_hours) {
        const dayOfWeek = dayKeysPt[scheduledAt.getDay()];
        const workingHours = selectedEmployee.working_hours as Record<string, { enabled?: boolean; isOpen?: boolean; start?: string; end?: string; open?: string; close?: string }>;
        const daySchedule = workingHours[dayOfWeek];

        const isEnabled = daySchedule?.enabled ?? daySchedule?.isOpen ?? false;
        const startTime = daySchedule?.start ?? daySchedule?.open ?? '09:00';
        const endTime = daySchedule?.end ?? daySchedule?.close ?? '18:00';

        if (!daySchedule || !isEnabled) {
          toast.error(`${selectedEmployee.name} não trabalha ${dayLabelsPt[dayOfWeek]}. Selecione outro dia.`);
          return;
        }

        const appointmentTime = formData.time;
        const appointmentEndTime = new Date(scheduledAt.getTime() + duration * 60000);
        const endTimeStr = formatTimeInSaoPaulo(appointmentEndTime);

        if (appointmentTime < startTime || endTimeStr > endTime) {
          toast.error(`${selectedEmployee.name} só atende das ${startTime} às ${endTime} neste dia. Selecione outro horário.`);
          return;
        }
      }

      // Frontend validation for time conflict per employee
      const newStart = scheduledAt.getTime();
      const newEnd = newStart + duration * 60000;
      const activeStatuses = ['scheduled', 'confirmed', 'in_progress'];

      const conflict = appointments.find(apt => {
        if (apt.employee_id !== empId) return false;
        if (!apt.status || !activeStatuses.includes(apt.status)) return false;

        const existingStart = new Date(apt.scheduled_at).getTime();
        const existingEnd = existingStart + apt.duration * 60000;

        return newStart < existingEnd && newEnd > existingStart;
      });

      if (conflict) {
        const conflictStart = formatTimeInSaoPaulo(conflict.scheduled_at);
        const conflictEnd = formatTimeInSaoPaulo(new Date(new Date(conflict.scheduled_at).getTime() + conflict.duration * 60000));
        const empName = employees.find(e => e.id === empId)?.name || 'O profissional';
        toast.error(`${empName} já possui um agendamento das ${conflictStart} às ${conflictEnd}. Selecione outro horário.`);
        return;
      }
    }

    await addAppointment.mutateAsync({
      client_id: formData.client_id,
      service_ids: formData.service_ids,
      service_employees: formData.service_employees,
      scheduled_at: toSaoPauloDateTime(formData.date, formData.time),
    });

    setIsDialogOpen(false);
    resetForm();
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    await updateStatus.mutateAsync({ id, status });
    toast.success(`Status atualizado para ${statusConfig[status]?.label}`);
  };

  const handleMarkAsCompleted = async (appointmentId: string, price: number) => {
    await markAsCompleted.mutateAsync({ appointmentId, price });
  };

  const handleDelete = async () => {
    if (deletingAppointmentId) {
      await deleteAppointment.mutateAsync(deletingAppointmentId);
      setDeletingAppointmentId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenEdit = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const appointmentDate = new Date(appointment.scheduled_at);
    const dateStr = getDateInSaoPaulo(appointmentDate);
    const timeStr = formatTimeInSaoPaulo(appointmentDate);

    // Load service_ids and service_employees from appointment_services
    let serviceIds: string[] = [];
    const serviceEmployees: Record<string, string> = {};

    if (appointment.appointment_services && appointment.appointment_services.length > 0) {
      serviceIds = appointment.appointment_services.map(as => as.service_id);
      appointment.appointment_services.forEach(as => {
        serviceEmployees[as.service_id] = as.employee_id;
      });
    } else if (appointment.service_id) {
      serviceIds = [appointment.service_id];
      if (appointment.employee_id) {
        serviceEmployees[appointment.service_id] = appointment.employee_id;
      }
    }

    setEditFormData({
      client_id: appointment.client_id || '',
      service_ids: serviceIds,
      service_employees: serviceEmployees,
      date: dateStr,
      time: timeStr,
    });
    setEditingAppointmentId(appointmentId);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointmentId) return;

    if (!editFormData.client_id) {
      toast.error('Selecione um cliente para o agendamento.');
      return;
    }
    if (editFormData.service_ids.length === 0) {
      toast.error('Selecione pelo menos um serviço para o agendamento.');
      return;
    }

    // Validate each service has an employee assigned
    const missingEmployee = editFormData.service_ids.find(sId => !editFormData.service_employees[sId]);
    if (missingEmployee) {
      const svc = activeServices.find(s => s.id === missingEmployee);
      toast.error(`Selecione um profissional para o serviço "${svc?.name || 'selecionado'}".`);
      return;
    }

    const scheduledAt = createSaoPauloDate(editFormData.date, editFormData.time);
    const duration = editServicesTotals.duration || 30;

    // Validate working day/time and conflicts for each unique employee
    const uniqueEmployeeIds = [...new Set(Object.values(editFormData.service_employees))];
    const dayKeysPt = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const dayLabelsPt: Record<string, string> = {
      dom: 'domingo', seg: 'segunda-feira', ter: 'terça-feira', qua: 'quarta-feira',
      qui: 'quinta-feira', sex: 'sexta-feira', sab: 'sábado',
    };

    for (const empId of uniqueEmployeeIds) {
      const selectedEmployee = employees.find(e => e.id === empId);
      if (selectedEmployee?.working_hours) {
        const dayOfWeek = dayKeysPt[scheduledAt.getDay()];
        const workingHours = selectedEmployee.working_hours as Record<string, { enabled?: boolean; isOpen?: boolean; start?: string; end?: string; open?: string; close?: string }>;
        const daySchedule = workingHours[dayOfWeek];

        const isEnabled = daySchedule?.enabled ?? daySchedule?.isOpen ?? false;
        const startTime = daySchedule?.start ?? daySchedule?.open ?? '09:00';
        const endTime = daySchedule?.end ?? daySchedule?.close ?? '18:00';

        if (!daySchedule || !isEnabled) {
          toast.error(`${selectedEmployee.name} não trabalha ${dayLabelsPt[dayOfWeek]}. Selecione outro dia.`);
          return;
        }

        const appointmentTime = editFormData.time;
        const appointmentEndTime = new Date(scheduledAt.getTime() + duration * 60000);
        const endTimeStr = formatTimeInSaoPaulo(appointmentEndTime);

        if (appointmentTime < startTime || endTimeStr > endTime) {
          toast.error(`${selectedEmployee.name} só atende das ${startTime} às ${endTime} neste dia. Selecione outro horário.`);
          return;
        }
      }

      const newStart = scheduledAt.getTime();
      const newEnd = newStart + duration * 60000;
      const activeStatuses = ['scheduled', 'confirmed', 'in_progress'];

      const conflict = appointments.find(apt => {
        if (apt.id === editingAppointmentId) return false;
        if (apt.employee_id !== empId) return false;
        if (!apt.status || !activeStatuses.includes(apt.status)) return false;

        const existingStart = new Date(apt.scheduled_at).getTime();
        const existingEnd = existingStart + apt.duration * 60000;

        return newStart < existingEnd && newEnd > existingStart;
      });

      if (conflict) {
        const conflictStart = formatTimeInSaoPaulo(conflict.scheduled_at);
        const conflictEnd = formatTimeInSaoPaulo(new Date(new Date(conflict.scheduled_at).getTime() + conflict.duration * 60000));
        const empName = employees.find(e => e.id === empId)?.name || 'O profissional';
        toast.error(`${empName} já possui um agendamento das ${conflictStart} às ${conflictEnd}. Selecione outro horário.`);
        return;
      }
    }

    await updateAppointment.mutateAsync({
      id: editingAppointmentId,
      client_id: editFormData.client_id,
      service_ids: editFormData.service_ids,
      service_employees: editFormData.service_employees,
      scheduled_at: toSaoPauloDateTime(editFormData.date, editFormData.time),
    });

    setIsEditDialogOpen(false);
    setEditingAppointmentId(null);
  };

  const formatTime = (scheduledAt: string, duration: number) => {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    return {
      startTime: formatTimeInSaoPaulo(start),
      endTime: formatTimeInSaoPaulo(end),
    };
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os agendamentos</p>
          </div>
          <Button className="gap-2 w-full sm:w-auto sm:self-end" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="scheduled">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 flex-1">
                  <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} placeholder="Filtrar por período" className="flex-1" />
                  {dateRange && (
                    <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment List */}
        {isMobile ? (
          /* Mobile: Cards */
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum agendamento encontrado
              </Card>
            ) : (
              filteredAppointments.map((appointment) => {
                const status = statusConfig[appointment.status || 'scheduled'];
                const times = formatTime(appointment.scheduled_at, appointment.duration);
                const isCompleted = appointment.status === 'completed';
                const canComplete = appointment.status === 'scheduled' || appointment.status === 'confirmed';

                return (
                  <MobileCard
                    key={appointment.id}
                    title={appointment.clients?.name || 'Cliente'}
                    subtitle={
                      appointment.appointment_services && appointment.appointment_services.length > 0
                        ? appointment.appointment_services.map(as => as.services?.name).filter(Boolean).join(', ')
                        : appointment.services?.name
                    }
                    badge={
                      <Badge variant="outline" className={cn(status?.class, 'text-xs')}>
                        {status?.label}
                      </Badge>
                    }
                    fields={[
                      { label: 'Data', value: new Date(appointment.scheduled_at).toLocaleDateString('pt-BR') },
                      { label: 'Horário', value: `${times.startTime} - ${times.endTime}` },
                      { label: 'Profissional', value: appointment.employees?.name || '-' },
                      { label: 'Valor', value: `R$ ${Number(appointment.price || 0).toFixed(2)}` },
                    ]}
                    actions={
                      <div className="flex gap-2">
                        {canComplete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 min-h-[44px] text-success"
                            onClick={() => handleMarkAsCompleted(appointment.id, Number(appointment.price || 0))}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Concluir
                          </Button>
                        )}
                        {!isCompleted && appointment.status !== 'cancelled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 min-h-[44px]"
                            onClick={() => handleOpenEdit(appointment.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="min-h-[44px]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(statusConfig)
                              .filter(([key]) => key !== 'completed')
                              .map(([key, config]) => (
                                <DropdownMenuItem key={key} onClick={() => handleStatusChange(appointment.id, key as AppointmentStatus)}>
                                  {config.label}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { setDeletingAppointmentId(appointment.id); setIsDeleteDialogOpen(true); }}
                            >
                              Cancelar Agendamento
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    }
                  />
                );
              })
            )}
          </div>
        ) : (
          /* Desktop: Table */
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum agendamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => {
                      const status = statusConfig[appointment.status || 'scheduled'];
                      const times = formatTime(appointment.scheduled_at, appointment.duration);
                      const isCompleted = appointment.status === 'completed';
                      const canComplete = appointment.status === 'scheduled' || appointment.status === 'confirmed';

                      return (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{new Date(appointment.scheduled_at).toLocaleDateString('pt-BR')}</p>
                                <p className="text-xs text-muted-foreground">{times.startTime} - {times.endTime}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm truncate max-w-[120px]">{appointment.clients?.name}</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              {appointment.appointment_services && appointment.appointment_services.length > 0 ? (
                                <>
                                  <p className="font-medium text-sm truncate max-w-[200px]">
                                    {appointment.appointment_services.map(as => as.services?.name).filter(Boolean).join(', ')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {appointment.appointment_services.length} serviço{appointment.appointment_services.length > 1 ? 's' : ''} - R$ {Number(appointment.price || 0).toFixed(2)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-sm truncate max-w-[120px]">{appointment.services?.name}</p>
                                  <p className="text-xs text-muted-foreground">R$ {Number(appointment.price || 0).toFixed(2)}</p>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {appointment.appointment_services && appointment.appointment_services.length > 0 ? (
                              <div className="space-y-0.5">
                                {(() => {
                                  const uniqueNames = [...new Set(appointment.appointment_services.map(as => as.employees?.name).filter(Boolean))];
                                  return uniqueNames.map((name, i) => (
                                    <span key={i} className="text-sm block">{name}</span>
                                  ));
                                })()}
                              </div>
                            ) : (
                              <span className="text-sm">{appointment.employees?.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge variant="outline" className={cn(status?.class, 'cursor-pointer text-xs')}>
                                  {status?.label}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {Object.entries(statusConfig)
                                  .filter(([key]) => key !== 'completed')
                                  .map(([key, config]) => (
                                    <DropdownMenuItem key={key} onClick={() => handleStatusChange(appointment.id, key as AppointmentStatus)}>
                                      {config.label}
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canComplete && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-success"
                                      onClick={() => handleMarkAsCompleted(appointment.id, Number(appointment.price || 0))}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Marcar como Concluído
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {!isCompleted && appointment.status !== 'cancelled' && (
                                  <DropdownMenuItem onClick={() => handleOpenEdit(appointment.id)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Agendamento
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingAppointmentId(appointment.id); setIsDeleteDialogOpen(true); }}>
                                  Cancelar Agendamento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Crie um novo agendamento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={formData.client_id} onValueChange={(v) => setFormData(p => ({ ...p, client_id: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <ClientQuickCreateDialog
                    onClientCreated={(id) => setFormData(p => ({ ...p, client_id: id }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Serviços e Profissionais *</Label>
                <div className="border rounded-md p-3 space-y-3 max-h-64 overflow-y-auto">
                  {activeServices.map(s => {
                    const isChecked = formData.service_ids.includes(s.id);
                    const availableForService = getEmployeesForService(s.id);
                    return (
                      <div key={s.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setFormData(prev => ({
                                  ...prev,
                                  service_ids: checked
                                    ? [...prev.service_ids, s.id]
                                    : prev.service_ids.filter(id => id !== s.id)
                                }));
                              }}
                            />
                            <span className="text-sm font-medium">{s.name}</span>
                          </label>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            R$ {Number(s.price).toFixed(2)} - {s.duration}min
                          </span>
                        </div>
                        {isChecked && (
                          <div className="ml-6">
                            <Select
                              value={formData.service_employees[s.id] || ''}
                              onValueChange={(v) => setFormData(prev => ({
                                ...prev,
                                service_employees: { ...prev.service_employees, [s.id]: v }
                              }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione o profissional" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableForService.length === 0 ? (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                    Nenhum profissional para este serviço
                                  </div>
                                ) : (
                                  availableForService.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formData.service_ids.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-2 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Duração total:</span>
                      <span className="font-medium">{selectedServicesTotals.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preço total:</span>
                      <span className="font-medium">R$ {selectedServicesTotals.price.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Hora *</Label>
                  <Input type="time" value={formData.time} onChange={(e) => setFormData(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={addAppointment.isPending}>
                {addAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Agendamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
              <DialogDescription>Altere os dados do agendamento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={editFormData.client_id} onValueChange={(v) => setEditFormData(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Serviços e Profissionais *</Label>
                <div className="border rounded-md p-3 space-y-3 max-h-64 overflow-y-auto">
                  {activeServices.map(s => {
                    const isChecked = editFormData.service_ids.includes(s.id);
                    const availableForService = getEmployeesForService(s.id);
                    return (
                      <div key={s.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setEditFormData(prev => ({
                                  ...prev,
                                  service_ids: checked
                                    ? [...prev.service_ids, s.id]
                                    : prev.service_ids.filter(id => id !== s.id)
                                }));
                              }}
                            />
                            <span className="text-sm font-medium">{s.name}</span>
                          </label>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            R$ {Number(s.price).toFixed(2)} - {s.duration}min
                          </span>
                        </div>
                        {isChecked && (
                          <div className="ml-6">
                            <Select
                              value={editFormData.service_employees[s.id] || ''}
                              onValueChange={(v) => setEditFormData(prev => ({
                                ...prev,
                                service_employees: { ...prev.service_employees, [s.id]: v }
                              }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione o profissional" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableForService.length === 0 ? (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                    Nenhum profissional para este serviço
                                  </div>
                                ) : (
                                  availableForService.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {editFormData.service_ids.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-2 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Duração total:</span>
                      <span className="font-medium">{editServicesTotals.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preço total:</span>
                      <span className="font-medium">R$ {editServicesTotals.price.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={editFormData.date} onChange={(e) => setEditFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Hora *</Label>
                  <Input type="time" value={editFormData.time} onChange={(e) => setEditFormData(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={updateAppointment.isPending}>
                {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Cancelar Agendamento</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Agendamentos;
