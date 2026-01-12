import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import { Clock, Calendar, Sun, Moon } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useMemo } from 'react';
import { format, getHours } from 'date-fns';

interface ReportHorariosProps {
  data: {
    weekdayData: Array<{ name: string; agendamentos: number }>;
    totalAppointments: number;
  };
}

export function ReportHorarios({ data }: ReportHorariosProps) {
  const { appointments } = useAppointments();

  const hourlyStats = useMemo(() => {
    // Agrupar por hora
    const hourlyCount: Record<number, number> = {};
    appointments.forEach(appointment => {
      const hour = getHours(new Date(appointment.scheduled_at));
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    });

    const hourlyData = Array.from({ length: 12 }, (_, i) => {
      const hour = i + 8; // 8h às 19h
      return {
        name: `${hour}h`,
        agendamentos: hourlyCount[hour] || 0,
      };
    });

    // Período do dia
    const morningCount = Object.entries(hourlyCount)
      .filter(([h]) => Number(h) >= 8 && Number(h) < 12)
      .reduce((acc, [, v]) => acc + v, 0);
    
    const afternoonCount = Object.entries(hourlyCount)
      .filter(([h]) => Number(h) >= 12 && Number(h) < 18)
      .reduce((acc, [, v]) => acc + v, 0);
    
    const eveningCount = Object.entries(hourlyCount)
      .filter(([h]) => Number(h) >= 18)
      .reduce((acc, [, v]) => acc + v, 0);

    // Dia mais movimentado
    const busiestDay = data.weekdayData.reduce((max, day) => 
      day.agendamentos > max.agendamentos ? day : max, 
      { name: '-', agendamentos: 0 }
    );

    // Horário mais movimentado
    const busiestHour = hourlyData.reduce((max, hour) => 
      hour.agendamentos > max.agendamentos ? hour : max, 
      { name: '-', agendamentos: 0 }
    );

    return {
      hourlyData,
      morningCount,
      afternoonCount,
      eveningCount,
      busiestDay,
      busiestHour,
    };
  }, [appointments, data.weekdayData]);

  const periodData = [
    { name: 'Manhã (8h-12h)', value: hourlyStats.morningCount, color: 'hsl(45, 93%, 47%)' },
    { name: 'Tarde (12h-18h)', value: hourlyStats.afternoonCount, color: 'hsl(25, 95%, 53%)' },
    { name: 'Noite (18h+)', value: hourlyStats.eveningCount, color: 'hsl(280, 65%, 55%)' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs de Horários */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-cyan-500/10 p-2 sm:p-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Dia Mais Movimentado</p>
                <p className="text-lg sm:text-xl font-bold">{hourlyStats.busiestDay.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-amber-500/10 p-2 sm:p-3">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Horário de Pico</p>
                <p className="text-lg sm:text-xl font-bold">{hourlyStats.busiestHour.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-yellow-500/10 p-2 sm:p-3">
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Manhã</p>
                <p className="text-lg sm:text-2xl font-bold">{hourlyStats.morningCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-purple-500/10 p-2 sm:p-3">
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Tarde/Noite</p>
                <p className="text-lg sm:text-2xl font-bold">{hourlyStats.afternoonCount + hourlyStats.eveningCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Agendamentos por Hora */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Agendamentos por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyStats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(220, 15%, 90%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="agendamentos" 
                    fill="hsl(190, 95%, 39%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agendamentos por Dia da Semana */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Agendamentos por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.weekdayData}>
                  <PolarGrid stroke="hsl(220, 15%, 90%)" />
                  <PolarAngleAxis dataKey="name" fontSize={12} />
                  <PolarRadiusAxis fontSize={10} />
                  <Radar
                    name="Agendamentos"
                    dataKey="agendamentos"
                    stroke="hsl(190, 95%, 39%)"
                    fill="hsl(190, 95%, 39%)"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Período */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Distribuição por Período do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(220, 15%, 90%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value} agendamentos`}
                />
                <Bar dataKey="value" name="Agendamentos" radius={[4, 4, 0, 0]}>
                  {periodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
