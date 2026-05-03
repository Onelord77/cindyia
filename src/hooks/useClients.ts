import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export type ClientStatusFilter = 'all' | 'lead' | 'client';

export function useClients(statusFilter: ClientStatusFilter = 'all', options?: { excludeWithAppointments?: boolean }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;
  const excludeWithAppointments = options?.excludeWithAppointments ?? false;

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients', tenantId, statusFilter, excludeWithAppointments],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter === 'lead') {
        query = query.eq('is_lead', true);
      } else if (statusFilter === 'client') {
        query = query.eq('is_lead', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Exclude leads that already have at least one appointment
      if (excludeWithAppointments && statusFilter === 'lead' && data && data.length > 0) {
        const clientIds = data.map(c => c.id);
        const { data: appts } = await supabase
          .from('appointments')
          .select('client_id')
          .in('client_id', clientIds)
          .eq('tenant_id', tenantId);
        const withAppt = new Set((appts ?? []).map(a => a.client_id));
        return data.filter(c => !withAppt.has(c.id));
      }

      return data;
    },
    enabled: !!tenantId,
  });

  const addClient = useMutation({
    mutationFn: async (client: Omit<ClientInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar cliente: ' + error.message);
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir cliente: ' + error.message);
    },
  });

  return {
    clients,
    isLoading,
    error,
    addClient,
    updateClient,
    deleteClient,
  };
}
