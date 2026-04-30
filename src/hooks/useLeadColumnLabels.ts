import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DEFAULT_COLUMN_LABELS } from '@/types/lead';
import type { LeadColumnKey } from '@/types/lead';

export function useLeadColumnLabels() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: rawLabels = [] } = useQuery({
    queryKey: ['lead_column_labels', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('lead_column_labels' as any)
        .select('column_key, custom_label')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return (data ?? []) as { column_key: string; custom_label: string }[];
    },
    enabled: !!tenantId,
  });

  const labels: Record<LeadColumnKey, string> = { ...DEFAULT_COLUMN_LABELS };
  for (const row of rawLabels) {
    const key = row.column_key as LeadColumnKey;
    if (key in labels) {
      labels[key] = row.custom_label;
    }
  }

  const updateLabel = useMutation({
    mutationFn: async ({ columnKey, customLabel }: { columnKey: LeadColumnKey; customLabel: string }) => {
      if (!tenantId) throw new Error('Tenant não encontrado.');
      const { error } = await supabase
        .from('lead_column_labels' as any)
        .upsert(
          { tenant_id: tenantId, column_key: columnKey, custom_label: customLabel },
          { onConflict: 'tenant_id,column_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_column_labels', tenantId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar nome da coluna: ' + error.message);
    },
  });

  return { labels, updateLabel };
}
