import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AppointmentSuggestionInput } from '@/types/appointment-suggestion';

export function useAppointmentSuggestion() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const createSuggestion = useMutation({
    mutationFn: async (input: Omit<AppointmentSuggestionInput, 'tenantId'>) => {
      const tenantId = profile?.tenant_id;
      if (!tenantId) throw new Error('Tenant não identificado');

      const { error: insertError } = await supabase
        .from('appointment_suggestions')
        .insert({
          appointment_id: input.appointmentId,
          tenant_id: tenantId,
          suggested_slots: input.suggestedSlots as any,
          observation: input.observation ?? null,
        });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'suggested' as any })
        .eq('id', input.appointmentId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Sugestão de horário enviada com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao enviar sugestão de horário.');
    },
  });

  return { createSuggestion };
}
