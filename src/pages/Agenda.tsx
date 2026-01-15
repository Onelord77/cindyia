import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock, Scissors, Loader2 } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useAppointments } from '@/hooks/useAppointments';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  
  const { employees, isLoading: loadingEmployees } = useEmployees();
  const { appointments, isLoading: loadingAppointments } = useAppointments();

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
      const appointmentDate = new Date(a.scheduled_at);
      return appointmentDate.toDateString() === date.toDateString() && a.status !== 'cancelled';
    });
  };

  const getAppointmentTime = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    return `${date.getHours().toString().padStart(2, '0')}:00`;
  };

  const formatAppointmentTime = (scheduledAt: string, duration: number) => {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    return {
      startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
    };
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
              >
                Dia
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
              >
                Semana
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
                      <>
                        <div key={`time-${time}`} className="border-b p-2 text-center text-sm text-muted-foreground bg-muted/10">
                          {time}
                        </div>
                        {activeEmployees.slice(0, 4).map((employee) => {
                          const appointment = getAppointmentsForDate(currentDate).find(
                            (a) => a.employee_id === employee.id && getAppointmentTime(a.scheduled_at) === time
                          );

                          return (
                            <div key={`${employee.id}-${time}`} className="border-b p-1 min-h-[56px] relative">
                              {appointment && (
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
                              )}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        ) : (
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
                    <>
                      <div key={`time-${time}`} className="border-b p-2 text-center text-sm text-muted-foreground bg-muted/10">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const dayAppointments = getAppointmentsForDate(day).filter(
                          (a) => getAppointmentTime(a.scheduled_at) === time
                        );

                        return (
                          <div key={`${day.toISOString()}-${time}`} className="border-b p-1 min-h-[48px]">
                            {dayAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={cn(
                                  'rounded border-l-2 p-1 text-xs mb-1 cursor-pointer',
                                  statusColors[appointment.status || 'scheduled']
                                )}
                              >
                                <p className="font-medium truncate">{appointment.clients?.name}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Agenda;