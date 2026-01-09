import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User, Scissors, MessageCircle, PenLine } from 'lucide-react';
import { Appointment } from '@/types';
import { cn } from '@/lib/utils';

interface AppointmentsListProps {
  appointments: Appointment[];
  title?: string;
}

const statusConfig = {
  pending: { label: 'Pendente', class: 'status-pending' },
  confirmed: { label: 'Confirmado', class: 'status-confirmed' },
  completed: { label: 'Concluído', class: 'status-completed' },
  cancelled: { label: 'Cancelado', class: 'status-cancelled' },
};

export function AppointmentsList({ appointments, title = 'Próximos Agendamentos' }: AppointmentsListProps) {
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
            const status = statusConfig[appointment.status];
            return (
              <div
                key={appointment.id}
                className="group flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                {/* Time */}
                <div className="flex flex-col items-center justify-center rounded-lg bg-secondary px-3 py-2 text-center">
                  <span className="text-lg font-bold text-foreground">{appointment.startTime}</span>
                  <span className="text-xs text-muted-foreground">{appointment.endTime}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{appointment.client?.name}</span>
                    {appointment.createdBy === 'whatsapp' ? (
                      <MessageCircle className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3.5 w-3.5" />
                      {appointment.service?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {appointment.employee?.name}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <Badge variant="outline" className={cn('shrink-0', status.class)}>
                  {status.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
