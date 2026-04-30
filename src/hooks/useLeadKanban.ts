import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LeadColumnKey } from '@/types/lead';

export function useLeadKanban() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const moveToColumn = useMutation({
    mutationFn: async ({ clientId, columnKey }: { clientId: string; columnKey: LeadColumnKey }) => {
      const { error } = await supabase
        .from('clients')
        .update({ kanban_column_key: columnKey } as any)
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao mover lead: ' + error.message);
    },
  });

  const convertToClient = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_lead: false, kanban_column_key: 'convertido' } as any)
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast.success('Lead convertido em cliente!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao converter lead: ' + error.message);
    },
  });

  return { moveToColumn, convertToClient };
}
