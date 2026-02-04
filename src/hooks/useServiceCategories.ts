import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ServiceCategory {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ServiceCategoryInsert {
  name: string;
  color?: string;
  sort_order?: number;
  tenant_id?: string;
}

interface ServiceCategoryUpdate {
  id: string;
  name?: string;
  color?: string;
  sort_order?: number;
}

export function useServiceCategories(overrideTenantId?: string) {
  const { profile, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = overrideTenantId || profile?.tenant_id;

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['service-categories', tenantId, isSuperAdmin],
    queryFn: async () => {
      // Super admin without tenant can see all categories
      if (isSuperAdmin && !tenantId) {
        const { data, error } = await supabase
          .from('service_categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        return data as ServiceCategory[];
      }

      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ServiceCategory[];
    },
    enabled: !!tenantId || isSuperAdmin,
  });

  const addCategory = useMutation({
    mutationFn: async (category: ServiceCategoryInsert) => {
      const targetTenantId = category.tenant_id || tenantId;
      if (!targetTenantId) throw new Error('Tenant não encontrado. Selecione uma empresa.');

      const { data, error } = await supabase
        .from('service_categories')
        .insert({ ...category, tenant_id: targetTenantId })
        .select()
        .single();

      if (error) throw error;
      return data as ServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: ServiceCategoryUpdate) => {
      const { data, error } = await supabase
        .from('service_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });

  return {
    categories,
    isLoading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
