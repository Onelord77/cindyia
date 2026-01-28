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
import { Search, Filter, Plus, MoreVertical, Eye, Edit, Calendar, X, Loader2, CheckCircle } from 'lucide-react';
import { cn, toSaoPauloDateTime, createSaoPauloDate, formatTimeInSaoPaulo, getTodayInSaoPaulo, getDateInSaoPaulo } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useEmployeeServicesBulk } from '@/hooks/useEmployeeServices';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
    service_id: '',
    employee_id: '',
    date: getTodayInSaoPaulo(),
    time: '09:00',
  });

  const [editFormData, setEditFormData] = useState({
    client_id: '',
    service_id: '',
    employee_id: '',
    date: '',
    time: '',
  });

  // Filter employees that can perform the selected service (for create form)
  const availableEmployees = useMemo(() => {
    if (!formData.service_id) return employees.filter(e => e.is_active);

    return employees.filter(e => {
      if (!e.is_active) return false;
      const empServices = employeeServicesMap[e.id] || [];
      return empServices.some(es => es.serviceId === formData.service_id);
    });
  }, [employees, formData.service_id, employeeServicesMap]);

  // Filter employees that can perform the selected service (for edit form)
  const availableEmployeesEdit = useMemo(() => {
    if (!editFormData.service_id) return employees.filter(e => e.is_active);

    return employees.filter(e => {
      if (!e.is_active) return false;
      const empServices = employeeServicesMap[e.id] || [];
      return empServices.some(es => es.serviceId === editFormData.service_id);
    });
  }, [employees, editFormData.service_id, employeeServicesMap]);

  // Reset employee selection when service changes and employee can't perform it
  useEffect(() => {
    if (formData.service_id && formData.employee_id) {
      const canPerform = availableEmployees.some(e => e.id === formData.employee_id);
      if (!canPerform) {
        setFormData(prev => ({ ...prev, employee_id: '' }));
      }
    }
  }, [formData.service_id, availableEmployees]);

  // Reset employee selection when service changes in edit form
  useEffect(() => {
    if (editFormData.service_id && editFormData.employee_id) {
      const canPerform = availableEmployeesEdit.some(e => e.id === editFormData.employee_id);
      if (!canPerform) {
        setEditFormData(prev => ({ ...prev, employee_id: '' }));
      }
    }
  }, [editFormData.service_id, availableEmployeesEdit]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesSearch = 
        appointment.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.services?.name?.toLowerCase().includes(searchTerm.toLowerCase());
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
      service_id: '',
      employee_id: '',
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
    if (!formData.service_id) {
      toast.error('Selecione um serviço para criar o agendamento.');
      return;
    }
    if (!formData.employee_id) {
      toast.error('Selecione um profissional para criar o agendamento.');
      return;
    }

    // Validate employee can perform the service (frontend validation)
    const empServices = employeeServicesMap[formData.employee_id] || [];
    const canPerform = empServices.some(es => es.serviceId === formData.service_id);
    if (!canPerform) {
      toast.error('Este profissional não executa o serviço selecionado.');
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    const scheduledAt = createSaoPauloDate(formData.date, formData.time);
    const duration = service?.duration || 30;

    // Frontend validation for working day (using PT-BR format as saved in DB)
    const selectedEmployee = employees.find(e => e.id === formData.employee_id);
    if (selectedEmployee?.working_hours) {
      // Map day index to Portuguese key (0=Sunday, 1=Monday, etc.)
      const dayKeysPt = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const dayLabelsPt: Record<string, string> = {
        dom: 'domingo',
        seg: 'segunda-feira',
        ter: 'terça-feira',
        qua: 'quarta-feira',
        qui: 'quinta-feira',
        sex: 'sexta-feira',
        sab: 'sábado',
      };

      const dayOfWeek = dayKeysPt[scheduledAt.getDay()];
      const workingHours = selectedEmployee.working_hours as Record<string, { enabled?: boolean; isOpen?: boolean; start?: string; end?: string; open?: string; close?: string }>;
      const daySchedule = workingHours[dayOfWeek];

      // Check enabled (PT-BR format) or isOpen (EN format)
      const isEnabled = daySchedule?.enabled ?? daySchedule?.isOpen ?? false;
      const startTime = daySchedule?.start ?? daySchedule?.open ?? '09:00';
      const endTime = daySchedule?.end ?? daySchedule?.close ?? '18:00';

      if (!daySchedule || !isEnabled) {
        toast.error(`${selectedEmployee.name} não trabalha ${dayLabelsPt[dayOfWeek]}. Selecione outro dia.`);
        return;
      }

      // Check if time is within working hours
      const appointmentTime = formData.time;
      const appointmentEndTime = new Date(scheduledAt.getTime() + duration * 60000);
      const endTimeStr = formatTimeInSaoPaulo(appointmentEndTime);

      if (appointmentTime < startTime || endTimeStr > endTime) {
        toast.error(`${selectedEmployee.name} só atende das ${startTime} às ${endTime} neste dia. Selecione outro horário.`);
        return;
      }
    }

    // Frontend validation for time conflict
    const newStart = scheduledAt.getTime();
    const newEnd = newStart + duration * 60000;
    const activeStatuses = ['scheduled', 'confirmed', 'in_progress'];

    const conflict = appointments.find(apt => {
      if (apt.employee_id !== formData.employee_id) return false;
      if (!apt.status || !activeStatuses.includes(apt.status)) return false;
      
      const existingStart = new Date(apt.scheduled_at).getTime();
      const existingEnd = existingStart + apt.duration * 60000;
      
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (conflict) {
      const conflictStart = formatTimeInSaoPaulo(conflict.scheduled_at);
      const conflictEnd = formatTimeInSaoPaulo(new Date(new Date(conflict.scheduled_at).getTime() + conflict.duration * 60000));
      toast.error(`O profissional já possui um agendamento das ${conflictStart} às ${conflictEnd}. Selecione outro horário.`);
      return;
    }

    await addAppointment.mutateAsync({
      client_id: formData.client_id,
      service_id: formData.service_id,
      employee_id: formData.employee_id,
      scheduled_at: toSaoPauloDateTime(formData.date, formData.time),
      duration,
      price: service?.price,
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

    setEditFormData({
      client_id: appointment.client_id || '',
      service_id: appointment.service_id || '',
      employee_id: appointment.employee_id || '',
      date: dateStr,
      time: timeStr,
    });
    setEditingAppointmentId(appointmentId);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointmentId) return;

    // Validate required fields with specific messages
    if (!editFormData.client_id) {
      toast.error('Selecione um cliente para o agendamento.');
      return;
    }
    if (!editFormData.service_id) {
      toast.error('Selecione um serviço para o agendamento.');
      return;
    }
    if (!editFormData.employee_id) {
      toast.error('Selecione um profissional para o agendamento.');
      return;
    }

    // Validate employee can perform the service (frontend validation)
    const empServices = employeeServicesMap[editFormData.employee_id] || [];
    const canPerform = empServices.some(es => es.serviceId === editFormData.service_id);
    if (!canPerform) {
      toast.error('Este profissional não executa o serviço selecionado.');
      return;
    }

    const service = services.find(s => s.id === editFormData.service_id);
    const scheduledAt = createSaoPauloDate(editFormData.date, editFormData.time);
    const duration = service?.duration || 30;

    // Frontend validation for working day (using PT-BR format as saved in DB)
    const selectedEmployee = employees.find(e => e.id === editFormData.employee_id);
    if (selectedEmployee?.working_hours) {
      const dayKeysPt = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const dayLabelsPt: Record<string, string> = {
        dom: 'domingo',
        seg: 'segunda-feira',
        ter: 'terça-feira',
        qua: 'quarta-feira',
        qui: 'quinta-feira',
        sex: 'sexta-feira',
        sab: 'sábado',
      };

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

    // Frontend validation for time conflict (excluding current appointment)
    const newStart = scheduledAt.getTime();
    const newEnd = newStart + duration * 60000;
    const activeStatuses = ['scheduled', 'confirmed', 'in_progress'];

    const conflict = appointments.find(apt => {
      if (apt.id === editingAppointmentId) return false; // Exclude current appointment
      if (apt.employee_id !== editFormData.employee_id) return false;
      if (!apt.status || !activeStatuses.includes(apt.status)) return false;

      const existingStart = new Date(apt.scheduled_at).getTime();
      const existingEnd = existingStart + apt.duration * 60000;

      return newStart < existingEnd && newEnd > existingStart;
    });

    if (conflict) {
      const conflictStart = formatTimeInSaoPaulo(conflict.scheduled_at);
      const conflictEnd = formatTimeInSaoPaulo(new Date(new Date(conflict.scheduled_at).getTime() + conflict.duration * 60000));
      toast.error(`O profissional já possui um agendamento das ${conflictStart} às ${conflictEnd}. Selecione outro horário.`);
      return;
    }

    await updateAppointment.mutateAsync({
      id: editingAppointmentId,
      client_id: editFormData.client_id,
      service_id: editFormData.service_id,
      employee_id: editFormData.employee_id,
      scheduled_at: toSaoPauloDateTime(editFormData.date, editFormData.time),
      duration,
      price: service?.price,
    });

    setIsEditDialogOpen(false);
    setEditingAppointmentId(null);
    toast.success('Agendamento atualizado com sucesso!');
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
                    subtitle={appointment.services?.name}
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
                              <p className="font-medium text-sm truncate max-w-[120px]">{appointment.services?.name}</p>
                              <p className="text-xs text-muted-foreground">R$ {Number(appointment.price || 0).toFixed(2)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{appointment.employees?.name}</span>
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
                <Select value={formData.client_id} onValueChange={(v) => setFormData(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select value={formData.service_id} onValueChange={(v) => setFormData(p => ({ ...p, service_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {activeServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {Number(s.price).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select 
                  value={formData.employee_id} 
                  onValueChange={(v) => setFormData(p => ({ ...p, employee_id: v }))}
                  disabled={!formData.service_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.service_id ? "Selecione" : "Selecione o serviço primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.length === 0 && formData.service_id ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhum profissional executa este serviço
                      </div>
                    ) : (
                      availableEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                {formData.service_id && availableEmployees.length === 0 && (
                  <p className="text-xs text-destructive">Nenhum profissional cadastrado executa este serviço.</p>
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
                <Label>Serviço *</Label>
                <Select value={editFormData.service_id} onValueChange={(v) => setEditFormData(p => ({ ...p, service_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {activeServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {Number(s.price).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select
                  value={editFormData.employee_id}
                  onValueChange={(v) => setEditFormData(p => ({ ...p, employee_id: v }))}
                  disabled={!editFormData.service_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={editFormData.service_id ? "Selecione" : "Selecione o serviço primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployeesEdit.length === 0 && editFormData.service_id ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhum profissional executa este serviço
                      </div>
                    ) : (
                      availableEmployeesEdit.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                {editFormData.service_id && availableEmployeesEdit.length === 0 && (
                  <p className="text-xs text-destructive">Nenhum profissional cadastrado executa este serviço.</p>
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
