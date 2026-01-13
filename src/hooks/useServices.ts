import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Service = Database['public']['Tables']['services']['Row'];
type ServiceInsert = Database['public']['Tables']['services']['Insert'];
type ServiceUpdate = Database['public']['Tables']['services']['Update'];

export function useServices(overrideTenantId?: string) {
  const { profile, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = overrideTenantId || profile?.tenant_id;

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['services', tenantId, isSuperAdmin],
    queryFn: async () => {
      // Super admin without tenant can see all services
      if (isSuperAdmin && !tenantId) {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return data;
      }
      
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId || isSuperAdmin,
  });

  const addService = useMutation({
    mutationFn: async (service: Omit<ServiceInsert, 'tenant_id'> & { tenant_id?: string }) => {
      const targetTenantId = service.tenant_id || tenantId;
      if (!targetTenantId) throw new Error('Tenant não encontrado. Selecione uma empresa.');
      
      const { data, error } = await supabase
        .from('services')
        .insert({ ...service, tenant_id: targetTenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar serviço: ' + error.message);
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: ServiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar serviço: ' + error.message);
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir serviço: ' + error.message);
    },
  });

  const toggleServiceActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('services')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Status do serviço atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  return {
    services,
    isLoading,
    error,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
  };
}
