import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TopServicesChart } from '@/components/dashboard/TopServicesChart';
import { mockAppointments, mockDashboardStats } from '@/lib/mock-data';
import { CalendarCheck, Clock, CheckCircle, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const todayAppointments = mockAppointments.filter(
    (a) => a.date.toDateString() === new Date().toDateString() && a.status !== 'cancelled'
  );

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
            value={mockDashboardStats.todayAppointments}
            subtitle="4 confirmados, 2 pendentes"
            icon={<CalendarCheck className="h-5 w-5" />}
            variant="primary"
          />
          <StatsCard
            title="Aguardando Confirmação"
            value={mockDashboardStats.pendingAppointments}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatsCard
            title="Concluídos Hoje"
            value={mockDashboardStats.completedToday}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
          />
          <StatsCard
            title="Receita do Mês"
            value={`R$ ${mockDashboardStats.monthlyRevenue.toLocaleString('pt-BR')}`}
            icon={<DollarSign className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Appointments List - Takes 2 columns */}
          <div className="lg:col-span-2">
            <AppointmentsList appointments={todayAppointments} />
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
                  <span className="font-semibold">R$ {mockDashboardStats.todayRevenue.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Esta semana</span>
                  <span className="font-semibold">R$ {mockDashboardStats.weeklyRevenue.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Este mês</span>
                  <span className="font-semibold text-primary">R$ {mockDashboardStats.monthlyRevenue.toLocaleString('pt-BR')}</span>
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
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {['CS', 'JS', 'PO'].map((initials, i) => (
                      <div
                        key={i}
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">3 funcionários trabalhando hoje</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart />
          <TopServicesChart data={mockDashboardStats.topServices} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
