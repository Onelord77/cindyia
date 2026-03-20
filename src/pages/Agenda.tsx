import React, { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [view, setView] = useState<'day' | 'week'>('week');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    service_ids: [] as string[],
    service_employees: {} as Record<string, string>,
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

  // Calculate totals for selected services
  const selectedServicesTotals = useMemo(() => {
    const selectedSvcs = activeServices.filter(s => formData.service_ids.includes(s.id));
    return {
      duration: selectedSvcs.reduce((sum, s) => sum + s.duration, 0),
      price: selectedSvcs.reduce((sum, s) => sum + Number(s.price), 0),
    };
  }, [formData.service_ids, activeServices]);

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
      service_ids: [],
      service_employees: {},
      date: getTodayInSaoPaulo(),
      time: '09:00',
    });
  };

  const handleSlotClick = (date: Date, time: string, _employeeId?: string) => {
    const dateStr = getDateInSaoPaulo(date);
    setFormData({
      client_id: '',
      service_ids: [],
      service_employees: {},
      date: dateStr,
      time: time,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
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

    const duration = selectedServicesTotals.duration || 30;
    const scheduledAt = createSaoPauloDate(formData.date, formData.time);

    // Validate time conflict for each unique employee
    const uniqueEmployeeIds = [...new Set(Object.values(formData.service_employees))];
    const newStart = scheduledAt.getTime();
    const newEnd = newStart + duration * 60000;
    const activeStatuses = ['scheduled', 'confirmed'];

    for (const empId of uniqueEmployeeIds) {
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
            /* Mobile Day View - Grid similar ao semanal */
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  <div className="grid grid-cols-[50px_1fr] divide-x divide-border">
                    {/* Header */}
                    <div className="border-b bg-muted/30 p-2 sticky top-0 z-10"></div>
                    <div
                      className={cn(
                        'border-b p-2 text-center sticky top-0 z-10',
                        currentDate.toDateString() === new Date().toDateString() ? 'bg-primary/10' : 'bg-muted/30'
                      )}
                    >
                      <p className="text-xs text-muted-foreground uppercase">
                        {currentDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </p>
                      <p className={cn(
                        'text-lg font-bold',
                        currentDate.toDateString() === new Date().toDateString() && 'text-primary'
                      )}>
                        {currentDate.getDate()}
                      </p>
                    </div>

                    {/* Time Slots */}
                    {timeSlots.map((time) => {
                      const dayAppointments = getAppointmentsForDate(currentDate).filter(
                        (a) => getAppointmentTime(a.scheduled_at) === time
                      );
                      const hasAppointments = dayAppointments.length > 0;

                      return (
                        <React.Fragment key={`time-${time}`}>
                          <div className="border-b p-2 text-center text-sm text-muted-foreground bg-muted/10">
                            {time}
                          </div>
                          <div
                            className={cn(
                              'border-b p-1 min-h-[48px]',
                              !hasAppointments && 'cursor-pointer hover:bg-primary/5 transition-colors'
                            )}
                            onClick={() => !hasAppointments && handleSlotClick(currentDate, time)}
                          >
                            {hasAppointments ? (
                              dayAppointments.map((appointment) => (
                                <div
                                  key={appointment.id}
                                  className={cn(
                                    'rounded-lg border-l-4 p-2 text-xs mb-1',
                                    statusColors[appointment.status || 'scheduled']
                                  )}
                                >
                                  <p className="font-semibold truncate">{appointment.clients?.name}</p>
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    <Scissors className="h-3 w-3" />
                                    <span className="truncate">
                                      {appointment.appointment_services && appointment.appointment_services.length > 0
                                        ? appointment.appointment_services.map(as => as.services?.name).filter(Boolean).join(', ')
                                        : appointment.services?.name}
                                    </span>
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-muted-foreground">
                                      {appointment.appointment_services && appointment.appointment_services.length > 0
                                        ? [...new Set(appointment.appointment_services.map(as => as.employees?.name).filter(Boolean))].join(', ')
                                        : appointment.employees?.name}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatAppointmentTime(appointment.scheduled_at, appointment.duration).startTime} - {formatAppointmentTime(appointment.scheduled_at, appointment.duration).endTime}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            /* Desktop Day View - Grid similar ao semanal */
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  <div className="grid grid-cols-[60px_1fr] divide-x divide-border">
                    {/* Header */}
                    <div className="border-b bg-muted/30 p-2 sticky top-0 z-10"></div>
                    <div
                      className={cn(
                        'border-b p-2 text-center sticky top-0 z-10',
                        currentDate.toDateString() === new Date().toDateString() ? 'bg-primary/10' : 'bg-muted/30'
                      )}
                    >
                      <p className="text-xs text-muted-foreground uppercase">
                        {currentDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </p>
                      <p className={cn(
                        'text-lg font-bold',
                        currentDate.toDateString() === new Date().toDateString() && 'text-primary'
                      )}>
                        {currentDate.getDate()}
                      </p>
                    </div>

                    {/* Time Slots */}
                    {timeSlots.map((time) => {
                      const dayAppointments = getAppointmentsForDate(currentDate).filter(
                        (a) => getAppointmentTime(a.scheduled_at) === time
                      );
                      const hasAppointments = dayAppointments.length > 0;

                      return (
                        <React.Fragment key={`time-${time}`}>
                          <div className="border-b p-2 text-center text-sm text-muted-foreground bg-muted/10">
                            {time}
                          </div>
                          <div
                            className={cn(
                              'border-b p-1 min-h-[48px]',
                              !hasAppointments && 'cursor-pointer hover:bg-primary/5 transition-colors'
                            )}
                            onClick={() => !hasAppointments && handleSlotClick(currentDate, time)}
                          >
                            {hasAppointments ? (
                              dayAppointments.map((appointment) => (
                                <div
                                  key={appointment.id}
                                  className={cn(
                                    'rounded-lg border-l-4 p-1.5 text-xs mb-1 cursor-pointer transition-all hover:shadow-md',
                                    statusColors[appointment.status || 'scheduled']
                                  )}
                                >
                                  <p className="font-semibold truncate">{appointment.clients?.name}</p>
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    <Scissors className="h-3 w-3" />
                                    <span className="truncate">
                                      {appointment.appointment_services && appointment.appointment_services.length > 0
                                        ? appointment.appointment_services.map(as => as.services?.name).filter(Boolean).join(', ')
                                        : appointment.services?.name}
                                    </span>
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-muted-foreground text-[10px]">
                                      {appointment.appointment_services && appointment.appointment_services.length > 0
                                        ? [...new Set(appointment.appointment_services.map(as => as.employees?.name).filter(Boolean))].join(', ')
                                        : appointment.employees?.name}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">
                                      {formatAppointmentTime(appointment.scheduled_at, appointment.duration).startTime} - {formatAppointmentTime(appointment.scheduled_at, appointment.duration).endTime}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </ScrollArea>
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
                                <p className="text-xs text-muted-foreground">
                                  {appointment.appointment_services && appointment.appointment_services.length > 0
                                    ? appointment.appointment_services.map(as => as.services?.name).filter(Boolean).join(', ')
                                    : appointment.services?.name}
                                </p>
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
      </div>
    </MainLayout>
  );
};

export default Agenda;