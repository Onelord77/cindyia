import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TopServicesChart } from '@/components/dashboard/TopServicesChart';
import { useAppointments } from '@/hooks/useAppointments';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useEmployees } from '@/hooks/useEmployees';
import { CalendarCheck, Clock, CheckCircle, DollarSign, TrendingUp, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const { appointments, isLoading: loadingAppointments } = useAppointments();
  const { financialEntries, isLoading: loadingFinancial } = useFinancialEntries();
  const { employees, isLoading: loadingEmployees } = useEmployees();

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayAppointments = appointments.filter(a => {
      const date = new Date(a.scheduled_at);
      return date >= today && date <= endOfToday && a.status !== 'cancelled';
    });

    const pendingAppointments = todayAppointments.filter(a => a.status === 'scheduled');
    const completedToday = todayAppointments.filter(a => a.status === 'completed');

    const todayRevenue = financialEntries
      .filter(e => {
        const date = new Date(e.date);
        return date >= today && date <= endOfToday && e.type === 'income';
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const weeklyRevenue = financialEntries
      .filter(e => {
        const date = new Date(e.date);
        return date >= startOfWeek && e.type === 'income';
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const monthlyRevenue = financialEntries
      .filter(e => {
        const date = new Date(e.date);
        return date >= startOfMonth && e.type === 'income';
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // Top services from completed appointments
    const serviceCount: Record<string, number> = {};
    appointments
      .filter(a => a.status === 'completed' && a.services)
      .forEach(a => {
        const serviceName = a.services?.name || 'Serviço';
        serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
      });

    const topServices = Object.entries(serviceCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // Calculate weekly revenue by day for chart
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weeklyRevenueByDay = dayNames.map((name, dayIndex) => {
      const dayRevenue = financialEntries
        .filter(e => {
          const date = new Date(e.date);
          return date >= startOfWeek &&
                 date.getDay() === dayIndex &&
                 e.type === 'income';
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { name, receita: dayRevenue };
    });

    return {
      todayAppointments: todayAppointments.length,
      pendingAppointments: pendingAppointments.length,
      completedToday: completedToday.length,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      topServices,
      weeklyRevenueByDay,
    };
  }, [appointments, financialEntries]);

  const activeEmployees = useMemo(() => {
    const today = new Date().getDay();
    return employees.filter(e => e.is_active);
  }, [employees]);

  const isLoading = loadingAppointments || loadingFinancial || loadingEmployees;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const todayAppointmentsList = appointments.filter(a => {
    const date = new Date(a.scheduled_at);
    const today = new Date();
    return date.toDateString() === today.toDateString() && a.status !== 'cancelled';
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu negócio para hoje,{' '}
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Agendamentos Hoje"
            value={stats.todayAppointments}
            subtitle={`${stats.todayAppointments - stats.pendingAppointments} confirmados, ${stats.pendingAppointments} pendentes`}
            icon={<CalendarCheck className="h-5 w-5" />}
            variant="primary"
          />
          <StatsCard
            title="Aguardando Confirmação"
            value={stats.pendingAppointments}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatsCard
            title="Concluídos Hoje"
            value={stats.completedToday}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
          />
          <StatsCard
            title="Receita do Mês"
            value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Appointments List - Takes 2 columns */}
          <div className="lg:col-span-2">
            <AppointmentsList appointments={todayAppointmentsList} />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hoje</span>
                  <span className="font-semibold">R$ {stats.todayRevenue.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Esta semana</span>
                  <span className="font-semibold">R$ {stats.weeklyRevenue.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Este mês</span>
                  <span className="font-semibold text-primary">R$ {stats.monthlyRevenue.toLocaleString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Funcionários Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeEmployees.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {activeEmployees.slice(0, 3).map((employee) => (
                        <div
                          key={employee.id}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground"
                        >
                          {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {activeEmployees.length} funcionário{activeEmployees.length > 1 ? 's' : ''} ativo{activeEmployees.length > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={stats.weeklyRevenueByDay} />
          <TopServicesChart data={stats.topServices} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
