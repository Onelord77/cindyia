import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ServiceCriterion } from '@/types/criteria';

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

type RawResponse = {
  id: string;
  appointment_id: string;
  criterion_id: string;
  tenant_id: string;
  answer: { value: unknown; isCustomAnswer?: boolean; raw_text?: string } | null;
  created_at: string | null;
};

function mapCriterion(row: RawCriterion): ServiceCriterion {
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
}

export type CriterionResponseEntry = { value: string; rawText?: string; isCustomAnswer: boolean };
export type CriteriaResponsesMap = Map<string, CriterionResponseEntry>;

export function useAppointmentCriteria(
  serviceIds: string[],
  appointmentId?: string | null
) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: criteria = [], isLoading: criteriaLoading } = useQuery({
    queryKey: ['appointment_criteria', [...serviceIds].sort()],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      const { data, error } = await supabase
        .from('service_criteria' as any)
        .select('*')
        .in('service_id', serviceIds)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as RawCriterion[]).map(mapCriterion);
    },
    enabled: serviceIds.length > 0,
  });

  const { data: rawResponses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ['appointment_criteria_responses', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];
      const { data, error } = await supabase
        .from('appointment_criteria_responses' as any)
        .select('*')
        .eq('appointment_id', appointmentId);
      if (error) throw error;
      return (data ?? []) as unknown as RawResponse[];
    },
    enabled: !!appointmentId,
  });

  // Build map from DB responses: criterionId -> { value, isCustomAnswer }
  const responsesMap: CriteriaResponsesMap = new Map(
    rawResponses
      .filter(r => r.answer != null)
      .map(r => [r.criterion_id, { value: String(r.answer!.value), rawText: r.answer!.raw_text || undefined, isCustomAnswer: r.answer!.isCustomAnswer ?? false }])
  );

  const saveResponses = useMutation({
    mutationFn: async ({
      appointmentId: apptId,
      responses,
    }: {
      appointmentId: string;
      responses: { criterionId: string; value: string; isCustomAnswer: boolean }[];
    }) => {
      // Delete existing responses atomically
      await (supabase as any)
        .from('appointment_criteria_responses')
        .delete()
        .eq('appointment_id', apptId);

      // Filter out empty responses before inserting
      const nonEmpty = responses.filter(r => r.value && r.value.trim() !== '');
      if (nonEmpty.length === 0) return;

      const rows = nonEmpty.map(r => ({
        appointment_id: apptId,
        criterion_id: r.criterionId,
        tenant_id: tenantId,
        answer: { value: r.value.trim(), isCustomAnswer: r.isCustomAnswer },
      }));

      const { error } = await (supabase as any)
        .from('appointment_criteria_responses')
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, { appointmentId: apptId }) => {
      queryClient.invalidateQueries({ queryKey: ['appointment_criteria_responses', apptId] });
    },
  });

  return {
    criteria,
    responsesMap,
    isLoading: criteriaLoading || responsesLoading,
    saveResponses,
  };
}
