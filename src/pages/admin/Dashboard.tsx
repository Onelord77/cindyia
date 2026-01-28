import { AdminLayout } from '@/components/layout/AdminLayout';
import { SaasStatsCard } from '@/components/dashboard/SaasStatsCard';
import { MrrChart } from '@/components/dashboard/MrrChart';
import { useSaasDashboard } from '@/hooks/useSaasDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  Building2,
  UserPlus,
  UserMinus,
  TrendingUp,
  Percent,
  Loader2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const AdminDashboard = () => {
  const { data, isLoading } = useSaasDashboard();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const netGrowth = (data?.newTenantsThisMonth || 0) - (data?.churnedTenantsThisMonth || 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Painel SaaS</h1>
          <p className="text-sm text-muted-foreground">
            Metricas de receita recorrente e crescimento da plataforma
          </p>
        </div>

        {/* Primary Metrics - MRR Focus */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SaasStatsCard
            title="MRR"
            value={formatCurrency(data?.mrr || 0)}
            subtitle="Receita Recorrente Mensal"
            icon={<DollarSign className="h-5 w-5" />}
            trend={data?.mrrGrowthPercent !== undefined && data?.mrrGrowthPercent !== 0 ? {
              value: data.mrrGrowthPercent,
              label: 'vs mes anterior'
            } : undefined}
            variant="primary"
            size="lg"
          />
          <SaasStatsCard
            title="Tenants Ativos"
            value={data?.activeTenants || 0}
            subtitle={`${data?.newTenantsThisMonth || 0} novos este mes`}
            icon={<Building2 className="h-5 w-5" />}
            trend={data?.tenantGrowthPercent !== undefined && data?.tenantGrowthPercent !== 0 ? {
              value: data.tenantGrowthPercent,
            } : undefined}
            variant="success"
          />
          <SaasStatsCard
            title="Receita por Tenant"
            value={formatCurrency(data?.revenuePerTenant || 0)}
            subtitle="ARPU medio"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="default"
          />
          <SaasStatsCard
            title="Churn Rate"
            value={`${(data?.churnRate || 0).toFixed(1)}%`}
            subtitle={`${data?.churnedTenantsThisMonth || 0} churned este mes`}
            icon={<UserMinus className="h-5 w-5" />}
            variant={data?.churnRate && data.churnRate > 5 ? 'danger' : 'warning'}
          />
        </div>

        {/* MRR Growth Chart and Quick Stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MrrChart data={data?.mrrHistory || []} />
          </div>

          {/* Quick Stats Panel */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-success/10 p-2.5">
                    <UserPlus className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-medium">Novos Tenants</span>
                </div>
                <span className="text-lg font-bold">{data?.newTenantsThisMonth || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-destructive/10 p-2.5">
                    <UserMinus className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="text-sm font-medium">Churned</span>
                </div>
                <span className="text-lg font-bold">{data?.churnedTenantsThisMonth || 0}</span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2.5">
                      <Percent className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Net Growth</span>
                  </div>
                  <span className={cn(
                    'text-lg font-bold',
                    netGrowth >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {netGrowth >= 0 ? '+' : ''}{netGrowth}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-warning/10 p-2.5">
                      <Users className="h-4 w-4 text-warning" />
                    </div>
                    <span className="text-sm font-medium">Total na Plataforma</span>
                  </div>
                  <span className="text-lg font-bold">{data?.totalTenants || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-11">
                  {data?.activeTenants || 0} ativos / {data?.inactiveTenants || 0} inativos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
