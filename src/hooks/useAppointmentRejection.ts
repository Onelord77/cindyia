import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useAppointmentRejection() {
  const queryClient = useQueryClient();

  const rejectAppointment = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled' as any,
          cancellation_reason: reason,
        })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento rejeitado.');
    },
    onError: () => {
      toast.error('Erro ao rejeitar agendamento.');
    },
  });

  return { rejectAppointment };
}
