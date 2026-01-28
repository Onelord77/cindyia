import React, { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock, Scissors, Loader2, Plus, CalendarDays, CalendarRange } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEmployees } from '@/hooks/useEmployees';
import { useAppointments } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { useServices } from '@/hooks/useServices';
import { useEmployeeServicesBulk } from '@/hooks/useEmployeeServices';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatTimeInSaoPaulo, isSameDayInSaoPaulo, getDateInSaoPaulo, toSaoPauloDateTime, createSaoPauloDate, getTodayInSaoPaulo } from '@/lib/utils';
import { toast } from 'sonner';

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const statusColors = {
  scheduled: 'bg-warning/20 border-l-warning text-foreground',
  confirmed: 'bg-primary/20 border-l-primary text-foreground',
  completed: 'bg-success/20 border-l-success text-foreground',
  cancelled: 'bg-destructive/20 border-l-destructive text-foreground',
  no_show: 'bg-muted/50 border-l-muted text-foreground',
};

const months = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

const Agenda = () => {
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    employee_id: '',
    date: getTodayInSaoPaulo(),
    time: '09:00',
  });

  const { employees, isLoading: loadingEmployees } = useEmployees();
  const { appointments, isLoading: loadingAppointments, addAppointment } = useAppointments();
  const { clients } = useClients();
  const { services } = useServices();

  // Get employee services for validation
  const employeeIds = employees.map(e => e.id);
  const { data: employeeServicesMap = {} } = useEmployeeServicesBulk(employeeIds);

  // Memoize active services to avoid filtering on every render
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);

  // Filter employees that can perform the selected service
  const availableEmployees = useMemo(() => {
    if (!formData.service_id) return employees.filter(e => e.is_active);

    return employees.filter(e => {
      if (!e.is_active) return false;
      const empServices = employeeServicesMap[e.id] || [];
      return empServices.some(es => es.serviceId === formData.service_id);
    });
  }, [employees, formData.service_id, employeeServicesMap]);

  // Reset employee selection when service changes and employee can't perform it
  useEffect(() => {
    if (formData.service_id && formData.employee_id) {
      const canPerform = availableEmployees.some(e => e.id === formData.employee_id);
      if (!canPerform) {
        setFormData(prev => ({ ...prev, employee_id: '' }));
      }
    }
  }, [formData.service_id, availableEmployees]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const handleMonthChange = (monthValue: string) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(monthValue));
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((a) => {
      // Compare dates in São Paulo timezone
      return isSameDayInSaoPaulo(a.scheduled_at, date) && a.status !== 'cancelled';
    });
  };

  const getAppointmentTime = (scheduledAt: string) => {
    // Get hour in São Paulo timezone and round to nearest hour slot
    const timeStr = formatTimeInSaoPaulo(scheduledAt);
    return `${timeStr.split(':')[0]}:00`;
  };

  const formatAppointmentTime = (scheduledAt: string, duration: number) => {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    return {
      startTime: formatTimeInSaoPaulo(start),
      endTime: formatTimeInSaoPaulo(end),
    };
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_id: '',
      employee_id: '',
      date: getTodayInSaoPaulo(),
      time: '09:00',
    });
  };

  const handleSlotClick = (date: Date, time: string, employeeId?: string) => {
    const dateStr = getDateInSaoPaulo(date);
    setFormData({
      client_id: '',
      service_id: '',
      employee_id: employeeId || '',
      date: dateStr,
      time: time,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Validate required fields
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

    // Validate employee can perform the service
    const empServices = employeeServicesMap[formData.employee_id] || [];
    const canPerform = empServices.some(es => es.serviceId === formData.service_id);
    if (!canPerform) {
      toast.error('Este profissional não executa o serviço selecionado.');
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    const duration = service?.duration || 30;

    // Check for conflicts with existing appointments
    const scheduledAt = createSaoPauloDate(formData.date, formData.time);
    const newStart = scheduledAt.getTime();
    const newEnd = newStart + duration * 60000;
    const activeStatuses = ['scheduled', 'confirmed'];

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

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.is_active);
  }, [employees]);

  const weekDays = getWeekDays();

  if (loadingEmployees || loadingAppointments) {
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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">Visualize e gerencie sua agenda de atendimentos</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-card p-1">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
                className="min-h-[36px]"
              >
                {isMobile ? <CalendarDays className="h-4 w-4" /> : 'Dia'}
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
                className="min-h-[36px]"
              >
                {isMobile ? <CalendarRange className="h-4 w-4" /> : 'Semana'}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
            
            {/* Month Filter */}
            <Select
              value={currentDate.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h2 className="text-lg font-semibold">
            {view === 'day'
              ? currentDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : `${weekDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </h2>
        </div>

        {/* Calendar Grid */}
        {view === 'day' ? (
          isMobile ? (
            /* Mobile Day View - Lista Vertical */
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {activeEmployees.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum funcionário ativo cadastrado
                  </div>
                ) : (
                  <ScrollArea className="h-[60vh]">
                    <div className="p-4 space-y-4">
                      {timeSlots.map((time) => {
                        const appointmentsAtTime = getAppointmentsForDate(currentDate).filter(
                          (a) => getAppointmentTime(a.scheduled_at) === time
                        );

                        return (
                          <div key={time} className="border-l-2 border-muted pl-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">{time}</p>
                            {appointmentsAtTime.length > 0 ? (
                              appointmentsAtTime.map((appointment) => (
                                <Card
                                  key={appointment.id}
                                  className={cn(
                                    'p-3 mb-2 border-l-4',
                                    statusColors[appointment.status || 'scheduled']
                                  )}
                                >
                                  <p className="font-medium">{appointment.clients?.name}</p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Scissors className="h-3 w-3" />
                                    {appointment.services?.name}
                                  </p>
                                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span>{appointment.employees?.name}</span>
                                    <span>
                                      {formatAppointmentTime(appointment.scheduled_at, appointment.duration).startTime} - {formatAppointmentTime(appointment.scheduled_at, appointment.duration).endTime}
                                    </span>
                                  </div>
                                </Card>
                              ))
                            ) : (
                              <Button
                                variant="ghost"
                                className="w-full h-12 border-2 border-dashed min-h-[44px]"
                                onClick={() => handleSlotClick(currentDate, time)}
                              >
                                <Plus className="h-4 w-4 mr-2" /> Agendar
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Desktop Day View - Grid */
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {activeEmployees.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum funcionário ativo cadastrado
                  </div>
                ) : (
                  <ScrollArea className="h-[60vh]">
                    <div className={cn("grid divide-x divide-border min-w-[600px]", `grid-cols-[60px_repeat(${Math.min(activeEmployees.length, 4)},1fr)]`)}>
                      {/* Time Column Header */}
                      <div className="border-b bg-muted/30 p-2 sticky top-0 z-10">
                        <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                      </div>

                      {/* Employee Headers */}
                      {activeEmployees.slice(0, 4).map((employee) => (
                        <div key={employee.id} className="border-b bg-muted/30 p-2 text-center sticky top-0 z-10">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                              {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="font-medium text-sm truncate max-w-[100px]">{employee.name}</span>
                          </div>
                        </div>
                      ))}

                      {/* Time Slots */}
                      {timeSlots.map((time) => (
                        <React.Fragment key={`time-${time}`}>
                          <div className="border-b p-2 text-center text-sm text-muted-foreground bg-muted/10">
                            {time}
                          </div>
                          {activeEmployees.slice(0, 4).map((employee) => {
                            const appointment = getAppointmentsForDate(currentDate).find(
                              (a) => a.employee_id === employee.id && getAppointmentTime(a.scheduled_at) === time
                            );

                            return (
                              <div
                                key={`${employee.id}-${time}`}
                                className={cn(
                                  'border-b p-1 min-h-[56px] relative',
                                  !appointment && 'cursor-pointer hover:bg-primary/5 transition-colors'
                                )}
                                onClick={() => !appointment && handleSlotClick(currentDate, time, employee.id)}
                              >
                                {appointment ? (
                                  <div
                                    className={cn(
                                      'rounded-lg border-l-4 p-1.5 text-xs cursor-pointer transition-all hover:shadow-md',
                                      statusColors[appointment.status || 'scheduled']
                                    )}
                                  >
                                    <p className="font-semibold truncate">{appointment.clients?.name}</p>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                      <Scissors className="h-3 w-3" />
                                      <span className="truncate">{appointment.services?.name}</span>
                                    </p>
                                    <p className="text-muted-foreground text-[10px]">
                                      {formatAppointmentTime(appointment.scheduled_at, appointment.duration).startTime} - {formatAppointmentTime(appointment.scheduled_at, appointment.duration).endTime}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )
        ) : (
          isMobile ? (
            /* Mobile Week View - Calendário Compacto */
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {weekDays.map((day) => {
                    const dayAppointments = getAppointmentsForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => { setCurrentDate(day); setView('day'); }}
                        className={cn(
                          'p-2 rounded-lg text-center transition-colors min-h-[80px] flex flex-col items-center justify-start',
                          isToday && 'bg-primary text-primary-foreground',
                          !isToday && 'hover:bg-muted'
                        )}
                      >
                        <p className="text-xs uppercase">
                          {day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                        </p>
                        <p className="text-lg font-bold">{day.getDate()}</p>
                        {dayAppointments.length > 0 && (
                          <Badge
                            variant={isToday ? 'secondary' : 'default'}
                            className="text-xs mt-1"
                          >
                            {dayAppointments.length}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Lista de agendamentos do dia selecionado */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Agendamentos da semana
                  </p>
                  <ScrollArea className="h-[40vh]">
                    <div className="space-y-2">
                      {weekDays.map((day) => {
                        const dayAppointments = getAppointmentsForDate(day);
                        if (dayAppointments.length === 0) return null;

                        return (
                          <div key={day.toISOString()} className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              {day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}
                            </p>
                            {dayAppointments.map((appointment) => (
                              <Card
                                key={appointment.id}
                                className={cn(
                                  'p-3 border-l-4',
                                  statusColors[appointment.status || 'scheduled']
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{appointment.clients?.name}</p>
                                  <span className="text-xs text-muted-foreground">
                                    {formatAppointmentTime(appointment.scheduled_at, appointment.duration).startTime}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{appointment.services?.name}</p>
                              </Card>
                            ))}
                          </div>
                        );
                      })}
                      {weekDays.every(day => getAppointmentsForDate(day).length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum agendamento nesta semana
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Desktop Week View - Grid */
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-border min-w-[800px]">
                    {/* Header */}
                    <div className="border-b bg-muted/30 p-2 sticky top-0 z-10"></div>
                    {weekDays.map((day) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'border-b p-2 text-center sticky top-0 z-10',
                            isToday ? 'bg-primary/10' : 'bg-muted/30'
                          )}
                        >
                          <p className="text-xs text-muted-foreground uppercase">
                            {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </p>
                          <p className={cn(
                            'text-lg font-bold',
                            isToday && 'text-primary'
                          )}>
                            {day.getDate()}
                          </p>
                        </div>
                      );
                    })}

                    {/* Time Slots */}
                    {timeSlots.map((time) => (
                      <React.Fragment key={`time-${time}`}>
                        <div className="border-b p-2 text-center text-sm text-muted-foreground bg-muted/10">
                          {time}
                        </div>
                        {weekDays.map((day) => {
                          const dayAppointments = getAppointmentsForDate(day).filter(
                            (a) => getAppointmentTime(a.scheduled_at) === time
                          );
                          const hasAppointments = dayAppointments.length > 0;

                          return (
                            <div
                              key={`${day.toISOString()}-${time}`}
                              className={cn(
                                'border-b p-1 min-h-[48px]',
                                !hasAppointments && 'cursor-pointer hover:bg-primary/5 transition-colors'
                              )}
                              onClick={() => !hasAppointments && handleSlotClick(day, time)}
                            >
                              {hasAppointments ? (
                                dayAppointments.map((appointment) => (
                                  <div
                                    key={appointment.id}
                                    className={cn(
                                      'rounded border-l-2 p-1 text-xs mb-1 cursor-pointer',
                                      statusColors[appointment.status || 'scheduled']
                                    )}
                                  >
                                    <p className="font-medium truncate">{appointment.clients?.name}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <Plus className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )
        )}

        {/* Create Appointment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Crie um agendamento para {new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {formData.time}
              </DialogDescription>
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
      </div>
    </MainLayout>
  );
};

export default Agenda;