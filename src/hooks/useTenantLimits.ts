import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TenantLimits {
  maxWhatsappInstances: number;
  tenantId: string | null;
  tenantName: string | null;
}

export function useTenantLimits() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tenant-limits', tenantId],
    queryFn: async (): Promise<TenantLimits> => {
      if (!tenantId) {
        return { maxWhatsappInstances: 1, tenantId: null, tenantName: null };
      }

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, max_whatsapp_instances')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching tenant limits:', error);
        throw error;
      }

      return {
        maxWhatsappInstances: tenant?.max_whatsapp_instances ?? 1,
        tenantId: tenant?.id || null,
        tenantName: tenant?.name || null,
      };
    },
    enabled: !!tenantId,
  });

  return {
    maxWhatsappInstances: data?.maxWhatsappInstances ?? 1,
    tenantId: data?.tenantId ?? tenantId ?? null,
    tenantName: data?.tenantName ?? null,
    isLoading,
    error,
    refetch,
  };
}