import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppointmentWithRelations } from '@/hooks/useAppointments';

interface AppointmentsListProps {
  appointments: AppointmentWithRelations[];
  title?: string;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Pendente', class: 'status-pending' },
  confirmed: { label: 'Confirmado', class: 'status-confirmed' },
  completed: { label: 'Concluído', class: 'status-completed' },
  cancelled: { label: 'Cancelado', class: 'status-cancelled' },
  no_show: { label: 'Não compareceu', class: 'status-cancelled' },
};

export function AppointmentsList({ appointments, title = 'Próximos Agendamentos' }: AppointmentsListProps) {
  const formatTime = (scheduledAt: string, duration: number) => {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    return {
      startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
    };
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Badge variant="secondary" className="text-xs">
          {appointments.length} agendamentos
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
          </div>
        ) : (
          appointments.map((appointment) => {
            const status = statusConfig[appointment.status || 'scheduled'];
            const times = formatTime(appointment.scheduled_at, appointment.duration);
            return (
              <div
                key={appointment.id}
                className="group flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex flex-col items-center justify-center rounded-lg bg-secondary px-3 py-2 text-center">
                  <span className="text-lg font-bold text-foreground">{times.startTime}</span>
                  <span className="text-xs text-muted-foreground">{times.endTime}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{appointment.clients?.name || 'Cliente'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3.5 w-3.5" />
                      {appointment.services?.name || 'Serviço'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {appointment.employees?.name || 'Profissional'}
                    </span>
                  </div>
                </div>

                <Badge variant="outline" className={cn('shrink-0', status?.class)}>
                  {status?.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
