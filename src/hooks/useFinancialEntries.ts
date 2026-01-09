import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type FinancialEntry = Database['public']['Tables']['financial_entries']['Row'];
type FinancialEntryInsert = Database['public']['Tables']['financial_entries']['Insert'];
type FinancialEntryUpdate = Database['public']['Tables']['financial_entries']['Update'];

export function useFinancialEntries() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: financialEntries = [], isLoading, error } = useQuery({
    queryKey: ['financial-entries', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('financial_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const addFinancialEntry = useMutation({
    mutationFn: async (entry: Omit<FinancialEntryInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      
      const { data, error } = await supabase
        .from('financial_entries')
        .insert({ 
          ...entry, 
          tenant_id: tenantId,
          created_by: user?.id 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries', tenantId] });
      toast.success('Lançamento financeiro criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lançamento: ' + error.message);
    },
  });

  const updateFinancialEntry = useMutation({
    mutationFn: async ({ id, ...updates }: FinancialEntryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries', tenantId] });
      toast.success('Lançamento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lançamento: ' + error.message);
    },
  });

  const deleteFinancialEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries', tenantId] });
      toast.success('Lançamento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir lançamento: ' + error.message);
    },
  });

  return {
    financialEntries,
    isLoading,
    error,
    addFinancialEntry,
    updateFinancialEntry,
    deleteFinancialEntry,
  };
}
