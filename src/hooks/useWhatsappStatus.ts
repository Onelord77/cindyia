import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const CONNECTED_STATUSES = ['open', 'connected', 'online'];

export function useWhatsappStatus() {
  const { profile, isSuperAdmin, isAdmin, isManager } = useAuth();
  const tenantId = profile?.tenant_id;

  const shouldFetch = !!tenantId && !isSuperAdmin && (isAdmin || isManager);

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-status', tenantId],
    queryFn: async () => {
      const { data: instances, error } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, status')
        .eq('tenant_id', tenantId!);

      if (error) {
        console.error('Error checking WhatsApp status:', error);
        return { instances: [] };
      }

      return { instances: instances || [] };
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const instances = data?.instances || [];
  const disconnectedInstances = instances.filter(
    (inst) => !CONNECTED_STATUSES.includes(inst.status?.toLowerCase() || '')
  );

  return {
    hasInstances: instances.length > 0,
    hasDisconnected: disconnectedInstances.length > 0,
    disconnectedNames: disconnectedInstances.map((i) => i.instance_name),
    isLoading,
  };
}
