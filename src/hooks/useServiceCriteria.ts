import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ServiceCriterion, CriterionInput } from '@/types/criteria';

type RawCriterion = {
  id: string;
  service_id: string;
  tenant_id: string;
  label: string;
  type: string;
  options: string[] | null;
  is_required: boolean | null;
  allow_custom_answer: boolean | null;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
};

function mapRow(row: RawCriterion): ServiceCriterion {
  return {
    id: row.id,
    serviceId: row.service_id,
    tenantId: row.tenant_id,
    label: row.label,
    type: row.type as ServiceCriterion['type'],
    options: Array.isArray(row.options) ? row.options : [],
    isRequired: row.is_required ?? false,
    allowCustomAnswer: row.allow_custom_answer ?? false,
    displayOrder: row.display_order,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}export function useServiceCriteria(serviceId: string | null | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: criteria = [], isLoading, refetch } = useQuery({
    queryKey: ['service_criteria', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_criteria' as any)
        .select('*')
        .eq('service_id', serviceId)
        .order('display_order', { ascending: true });
      if (error) throw error;
     return ((data ?? []) as unknown as RawCriterion[]).map(mapRow);
    },
    enabled: !!serviceId,
  });

  const createCriterion = useMutation({
    mutationFn: async ({ serviceId: sid, input }: { serviceId: string; input: CriterionInput }) => {
      if (!input.label.trim()) throw new Error('A pergunta é obrigatória');
      if (input.type === 'choice' && input.options.filter(o => o.trim()).length < 2) {
        throw new Error('Múltipla escolha precisa de pelo menos 2 opções');
      }

      const maxOrder = criteria.length > 0
        ? Math.max(...criteria.map(c => c.displayOrder))
        : -1;

      const { error } = await supabase
        .from('service_criteria' as any)
        .insert({
          service_id: sid,
          tenant_id: tenantId,
          label: input.label.trim(),
          type: input.type,
          options: input.type === 'choice' ? input.options.filter(o => o.trim()) : [],
          is_required: input.isRequired,
          allow_custom_answer: input.type === 'choice' ? input.allowCustomAnswer : false,
          display_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_criteria', serviceId] });
      toast.success('Critério adicionado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCriterion = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CriterionInput> }) => {
      if (input.label !== undefined && !input.label.trim()) {
        throw new Error('A pergunta é obrigatória');
      }
      if (input.type === 'choice' && input.options !== undefined) {
        if (input.options.filter(o => o.trim()).length < 2) {
          throw new Error('Múltipla escolha precisa de pelo menos 2 opções');
        }
      }

      const patch: Record<string, unknown> = {};
      if (input.label !== undefined) patch['label'] = input.label.trim();
      if (input.type !== undefined) patch['type'] = input.type;
      if (input.options !== undefined) {
        patch['options'] = input.type === 'choice' || (input.type === undefined)
          ? input.options.filter(o => o.trim())
          : [];
      }
      if (input.isRequired !== undefined) patch['is_required'] = input.isRequired;
      if (input.allowCustomAnswer !== undefined) {
        patch['allow_custom_answer'] = input.type === 'choice' || input.type === undefined
          ? input.allowCustomAnswer
          : false;
      }

      const { error } = await supabase
        .from('service_criteria' as any)
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_criteria', serviceId] });
      toast.success('Critério atualizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });const deleteCriterion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_criteria' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_criteria', serviceId] });
      toast.success('Critério removido');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderCriteria = useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      const updates = items.map(({ id, display_order }) =>
        supabase
          .from('service_criteria' as any)
          .update({ display_order })
          .eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_criteria', serviceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    criteria,
    isLoading,
    refetch,
    createCriterion,
    updateCriterion,
    deleteCriterion,
    reorderCriteria,
  };
}