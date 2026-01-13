import { Users, UserX, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LeadStatsCardsProps {
  total: number;
  notScheduled: number;
  scheduled: number;
}

export function LeadStatsCards({ total, notScheduled, scheduled }: LeadStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="glass-card">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Leads</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
            <UserX className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Não Agendaram</p>
            <p className="text-2xl font-bold">{notScheduled}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
            <CalendarCheck className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Já Agendaram</p>
            <p className="text-2xl font-bold">{scheduled}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
