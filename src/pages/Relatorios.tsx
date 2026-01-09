import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Download, TrendingUp, Users, Calendar, DollarSign, X } from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { isWithinInterval, startOfDay, endOfDay, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Relatorios = () => {
  const { appointments, financialEntries } = useAppStore();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const filteredData = useMemo(() => {
    const filteredAppointments = appointments.filter(appointment => {
      if (dateRange?.from && dateRange?.to) {
        const appointmentDate = new Date(appointment.date);
        return isWithinInterval(appointmentDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      return true;
    });

    const filteredEntries = financialEntries.filter(entry => {
      if (dateRange?.from && dateRange?.to) {
        const entryDate = new Date(entry.date);
        return isWithinInterval(entryDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      return true;
    });

    // Calculate KPIs
    const totalRevenue = filteredEntries
      .filter(e => e.type === 'income')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalAppointments = filteredAppointments.length;
    const completedAppointments = filteredAppointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = filteredAppointments.filter(a => a.status === 'cancelled').length;
    const ticketMedio = completedAppointments > 0 ? totalRevenue / completedAppointments : 0;
    const cancelRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

    // Group revenue by day
    const revenueByDay: Record<string, { receita: number; despesa: number }> = {};
    filteredEntries.forEach(entry => {
      const dayKey = format(new Date(entry.date), 'dd/MM');
      if (!revenueByDay[dayKey]) {
        revenueByDay[dayKey] = { receita: 0, despesa: 0 };
      }
      if (entry.type === 'income') {
        revenueByDay[dayKey].receita += entry.amount;
      } else {
        revenueByDay[dayKey].despesa += entry.amount;
      }
    });

    const dailyData = Object.entries(revenueByDay)
      .map(([name, values]) => ({ name, ...values }))
      .slice(-7);

    // Group by service
    const serviceCount: Record<string, number> = {};
    filteredAppointments.forEach(appointment => {
      const serviceName = appointment.service?.name || 'Outros';
      serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
    });

    const colors = [
      'hsl(340, 65%, 55%)',
      'hsl(340, 55%, 60%)',
      'hsl(340, 45%, 65%)',
      'hsl(340, 35%, 70%)',
      'hsl(340, 25%, 75%)',
    ];

    const serviceData = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index] || colors[colors.length - 1],
      }));

    // Group by weekday
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    filteredAppointments.forEach(appointment => {
      const day = new Date(appointment.date).getDay();
      weekdayCount[day]++;
    });

    const weekdayData = weekdayNames.map((name, index) => ({
      name,
      agendamentos: weekdayCount[index],
    }));

    return {
      totalRevenue,
      totalAppointments,
      ticketMedio,
      cancelRate,
      dailyData,
      serviceData,
      weekdayData,
    };
  }, [appointments, financialEntries, dateRange]);

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análise detalhada do seu negócio</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder="Selecione o período"
            />
            {dateRange && (
              <Button variant="ghost" size="icon" onClick={clearDateFilter} className="min-h-[44px] min-w-[44px]">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="gap-2 min-h-[44px] w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-full bg-primary/10 p-2 sm:p-3">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">R$ {filteredData.totalRevenue.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-full bg-success/10 p-2 sm:p-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Agendamentos</p>
                  <p className="text-lg sm:text-2xl font-bold">{filteredData.totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-full bg-warning/10 p-2 sm:p-3">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">R$ {filteredData.ticketMedio.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-full bg-destructive/10 p-2 sm:p-3">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Cancelamentos</p>
                  <p className="text-lg sm:text-2xl font-bold">{filteredData.cancelRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Receitas x Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredData.dailyData}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(220, 15%, 90%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      name="Receita"
                      stroke="hsl(152, 70%, 45%)"
                      fillOpacity={1}
                      fill="url(#colorReceita)"
                    />
                    <Area
                      type="monotone"
                      dataKey="despesa"
                      name="Despesa"
                      stroke="hsl(0, 84%, 60%)"
                      fillOpacity={1}
                      fill="url(#colorDespesa)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Serviços Mais Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                {filteredData.serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredData.serviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {filteredData.serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} agendamentos`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Agendamentos por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(220, 15%, 90%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="agendamentos" fill="hsl(340, 65%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Relatorios;
