import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];
type AppointmentStatus = Database['public']['Enums']['appointment_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

export interface AppointmentWithRelations extends Appointment {
  clients?: { id: string; name: string; phone: string | null; email: string | null } | null;
  employees?: { id: string; name: string } | null;
  services?: { id: string; name: string; price: number; duration: number } | null;
}

export function useAppointments() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (id, name, phone, email),
          employees (id, name),
          services (id, name, price, duration)
        `)
        .eq('tenant_id', tenantId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as AppointmentWithRelations[];
    },
    enabled: !!tenantId,
  });

  const addAppointment = useMutation({
    mutationFn: async (appointment: Omit<AppointmentInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({ 
          ...appointment, 
          tenant_id: tenantId,
          created_by: user?.id 
        })
        .select(`
          *,
          clients (id, name, phone, email),
          employees (id, name),
          services (id, name, price, duration)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar agendamento: ' + error.message);
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...updates }: AppointmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          clients (id, name, phone, email),
          employees (id, name),
          services (id, name, price, duration)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      toast.success('Agendamento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, payment_status }: { id: string; status: AppointmentStatus; payment_status?: PaymentStatus }) => {
      const updates: AppointmentUpdate = { status };
      if (payment_status) {
        updates.payment_status = payment_status;
      }
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries', tenantId] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir agendamento: ' + error.message);
    },
  });

  return {
    appointments,
    isLoading,
    error,
    addAppointment,
    updateAppointment,
    updateStatus,
    deleteAppointment,
  };
}
