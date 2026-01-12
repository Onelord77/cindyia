import { useAppointments as useBaseAppointments } from './useAppointments';
import { useNotifications } from '@/components/notifications';

export function useAppointmentsWithNotifications() {
  const baseHook = useBaseAppointments();
  const { addNotification } = useNotifications();

  const addAppointmentWithNotification = {
    ...baseHook.addAppointment,
    mutateAsync: async (data: Parameters<typeof baseHook.addAppointment.mutateAsync>[0]) => {
      const result = await baseHook.addAppointment.mutateAsync(data);
      addNotification(
        'appointment_created',
        'Novo Agendamento',
        `Agendamento criado para ${result.clients?.name || 'Cliente'}`
      );
      return result;
    },
  };

  const updateAppointmentWithNotification = {
    ...baseHook.updateAppointment,
    mutateAsync: async (data: Parameters<typeof baseHook.updateAppointment.mutateAsync>[0]) => {
      const result = await baseHook.updateAppointment.mutateAsync(data);
      if (data.scheduled_at) {
        addNotification(
          'appointment_rescheduled',
          'Agendamento Remarcado',
          `Agendamento remarcado para ${result.clients?.name || 'Cliente'}`
        );
      }
      return result;
    },
  };

  const updateStatusWithNotification = {
    ...baseHook.updateStatus,
    mutateAsync: async (data: Parameters<typeof baseHook.updateStatus.mutateAsync>[0]) => {
      const result = await baseHook.updateStatus.mutateAsync(data);
      if (data.status === 'cancelled') {
        addNotification(
          'appointment_cancelled',
          'Agendamento Cancelado',
          'Um agendamento foi cancelado'
        );
      }
      return result;
    },
  };

  return {
    ...baseHook,
    addAppointmentWithNotification,
    updateAppointmentWithNotification,
    updateStatusWithNotification,
  };
}
