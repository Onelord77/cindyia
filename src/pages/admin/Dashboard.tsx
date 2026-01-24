import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Building2, Users, CalendarCheck, DollarSign, Loader2 } from 'lucide-react';

const AdminDashboard = () => {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma CindyIA
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Tenants"
            value={data?.totalTenants || 0}
            subtitle={`${data?.activeTenants || 0} ativos`}
            icon={<Building2 className="h-5 w-5" />}
            variant="primary"
          />
          <StatsCard
            title="Agendamentos Hoje"
            value={data?.todayAppointments || 0}
            subtitle={`${data?.totalAppointments || 0} total`}
            icon={<CalendarCheck className="h-5 w-5" />}
            variant="success"
          />
          <StatsCard
            title="Usuários"
            value={data?.totalUsers || 0}
            icon={<Users className="h-5 w-5" />}
            variant="warning"
          />
          <StatsCard
            title="Receita do Mês"
            value={`R$ ${(data?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
