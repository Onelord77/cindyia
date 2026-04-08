import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const CONNECTED_STATUSES = ['open', 'connected', 'online'];

export interface AdminWhatsappInstance {
  id: string;
  tenant_id: string;
  instance_name: string;
  status: string | null;
  updated_at: string | null;
  profile_name: string | null;
  tenant_name: string;
}

export function useAdminWhatsappStatus() {
  const { isSuperAdmin } = useAuth();

  const query = useQuery({
    queryKey: ['admin-whatsapp-status'],
    queryFn: async (): Promise<AdminWhatsappInstance[]> => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, tenant_id, instance_name, status, updated_at, profile_name, tenants(name)')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin whatsapp instances:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        instance_name: row.instance_name,
        status: row.status,
        updated_at: row.updated_at,
        profile_name: row.profile_name,
        tenant_name: row.tenants?.name || 'Sem nome',
      }));
    },
    enabled: !!isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const instances = query.data || [];
  const isConnected = (s: string | null) =>
    CONNECTED_STATUSES.includes((s || '').toLowerCase());

  const disconnectedInstances = instances.filter((i) => !isConnected(i.status));
  const connectedInstances = instances.filter((i) => isConnected(i.status));
  const tenantsWithIssues = Array.from(
    new Set(disconnectedInstances.map((i) => i.tenant_name))
  );

  return {
    instances,
    connectedInstances,
    disconnectedInstances,
    disconnectedCount: disconnectedInstances.length,
    connectedCount: connectedInstances.length,
    totalCount: instances.length,
    tenantsWithIssues,
    hasDisconnected: disconnectedInstances.length > 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isConnected,
  };
}
