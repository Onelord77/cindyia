import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      // Total de tenants
      const { count: totalTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      // Tenants ativos
      const { count: activeTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Agendamentos de hoje (cross-tenant)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString());

      // Total de agendamentos
      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // Total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Receita do mês (todos os tenants)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: revenueData } = await supabase
        .from('financial_entries')
        .select('amount')
        .eq('type', 'income')
        .gte('date', startOfMonth.toISOString());

      const monthlyRevenue = revenueData?.reduce(
        (sum, entry) => sum + Number(entry.amount), 0
      ) || 0;

      return {
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        todayAppointments: todayAppointments || 0,
        totalAppointments: totalAppointments || 0,
        totalUsers: totalUsers || 0,
        monthlyRevenue,
      };
    },
  });

  return { data, isLoading };
}
