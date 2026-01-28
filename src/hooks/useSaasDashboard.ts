import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SaasDashboardData {
  // Current metrics
  mrr: number;
  activeTenants: number;
  newTenantsThisMonth: number;
  churnedTenantsThisMonth: number;
  revenuePerTenant: number;

  // Growth metrics
  mrrGrowthPercent: number;
  tenantGrowthPercent: number;

  // Historical data for charts
  mrrHistory: {
    month: string;
    mrr: number;
    newMrr: number;
    churnedMrr: number;
  }[];

  // Churn details
  churnRate: number;

  // Additional details
  totalTenants: number;
  inactiveTenants: number;
}

export function useSaasDashboard() {
  return useQuery({
    queryKey: ['saas-dashboard'],
    queryFn: async (): Promise<SaasDashboardData> => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      // Get all tenants with monthly_fee
      const { data: allTenants } = await supabase
        .from('tenants')
        .select('id, monthly_fee, created_at, status');

      const activeTenantData = allTenants?.filter(t => t.status === 'active') || [];
      const inactiveTenants = allTenants?.filter(t => t.status !== 'active').length || 0;
      const totalTenants = allTenants?.length || 0;

      // Calculate current MRR from active tenants
      const mrr = activeTenantData.reduce(
        (sum, t) => sum + (Number(t.monthly_fee) || 0), 0
      );

      const activeTenants = activeTenantData.length;

      // New tenants this month (created this month and active)
      const newTenantsThisMonth = activeTenantData.filter(t =>
        new Date(t.created_at || '') >= startOfMonth
      ).length;

      // Get churned tenants this month from history
      const { data: churnedData } = await supabase
        .from('tenant_status_history')
        .select('tenant_id')
        .eq('old_status', 'active')
        .in('new_status', ['inactive', 'suspended'])
        .gte('changed_at', startOfMonth.toISOString());

      const churnedTenantsThisMonth = churnedData?.length || 0;

      // Get historical MRR data (last 12 months)
      const { data: mrrSnapshots } = await supabase
        .from('mrr_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: true })
        .limit(12);

      // Get last month's data for growth calculation
      const lastMonthSnapshot = mrrSnapshots?.find(s => {
        const snapshotDate = new Date(s.snapshot_date);
        return snapshotDate >= startOfLastMonth && snapshotDate <= endOfLastMonth;
      });

      // Calculate growth
      const lastMrr = lastMonthSnapshot?.total_mrr || 0;
      const mrrGrowthPercent = lastMrr > 0
        ? ((mrr - lastMrr) / lastMrr) * 100
        : (mrr > 0 ? 100 : 0);

      const lastActiveTenants = lastMonthSnapshot?.active_tenants || 0;
      const tenantGrowthPercent = lastActiveTenants > 0
        ? ((activeTenants - lastActiveTenants) / lastActiveTenants) * 100
        : (activeTenants > 0 ? 100 : 0);

      // Calculate churn rate
      const churnRate = activeTenants > 0
        ? (churnedTenantsThisMonth / (activeTenants + churnedTenantsThisMonth)) * 100
        : 0;

      // Format history for charts
      const mrrHistory = mrrSnapshots?.map(s => ({
        month: new Date(s.snapshot_date).toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit'
        }),
        mrr: Number(s.total_mrr),
        newMrr: Number(s.mrr_from_new),
        churnedMrr: Number(s.mrr_churned),
      })) || [];

      // Add current month to history if not present
      const currentMonthKey = startOfMonth.toISOString().split('T')[0];
      const hasCurrentMonth = mrrSnapshots?.some(s => s.snapshot_date === currentMonthKey);

      if (!hasCurrentMonth) {
        const newMrrThisMonth = activeTenantData
          .filter(t => new Date(t.created_at || '') >= startOfMonth)
          .reduce((sum, t) => sum + (Number(t.monthly_fee) || 0), 0);

        mrrHistory.push({
          month: startOfMonth.toLocaleDateString('pt-BR', {
            month: 'short',
            year: '2-digit'
          }),
          mrr,
          newMrr: newMrrThisMonth,
          churnedMrr: 0,
        });
      }

      return {
        mrr,
        activeTenants,
        newTenantsThisMonth,
        churnedTenantsThisMonth,
        revenuePerTenant: activeTenants > 0 ? mrr / activeTenants : 0,
        mrrGrowthPercent,
        tenantGrowthPercent,
        mrrHistory,
        churnRate,
        totalTenants,
        inactiveTenants,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
