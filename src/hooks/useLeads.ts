import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LeadStatus = 'new' | 'in_conversation' | 'not_scheduled' | 'scheduled';
export type MessageDirection = 'inbound' | 'outbound';

export interface Lead {
  id: string;
  tenant_id: string;
  whatsapp_number: string;
  name: string | null;
  first_contact_at: string;
  last_message_at: string;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: string;
    name: string;
  };
  tags?: LeadTag[];
}

export interface LeadTag {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadTagLink {
  id: string;
  lead_id: string;
  tag_id: string;
  created_at: string;
}

export interface LeadMessage {
  id: string;
  lead_id: string;
  direction: MessageDirection;
  content: string;
  sent_at: string;
  external_message_id: string | null;
  created_at: string;
}

export interface LeadWithTags extends Lead {
  lead_tag_links?: { tag_id: string; lead_tags: LeadTag }[];
}

export function useLeads(filters?: {
  status?: LeadStatus | 'all';
  tagIds?: string[];
  search?: string;
  tenantId?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all leads with tags
  const { data: leads = [], isLoading, error, refetch } = useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          tenant:tenants(id, name),
          lead_tag_links(
            tag_id,
            lead_tags(*)
          )
        `)
        .order('last_message_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,whatsapp_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include tags directly
      const leadsWithTags = (data || []).map((lead: LeadWithTags) => ({
        ...lead,
        tags: lead.lead_tag_links?.map(link => link.lead_tags).filter(Boolean) || []
      }));

      // Filter by tags if needed
      if (filters?.tagIds && filters.tagIds.length > 0) {
        return leadsWithTags.filter(lead => 
          lead.tags?.some(tag => filters.tagIds?.includes(tag.id))
        );
      }

      return leadsWithTags;
    },
  });

  // Fetch lead stats
  const { data: stats } = useQuery({
    queryKey: ['leads-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('status');

      if (error) throw error;

      const total = data?.length || 0;
      const notScheduled = data?.filter(l => l.status === 'not_scheduled').length || 0;
      const scheduled = data?.filter(l => l.status === 'scheduled').length || 0;

      return { total, notScheduled, scheduled };
    },
  });

  // Create lead
  const createLead = useMutation({
    mutationFn: async (lead: {
      tenant_id: string;
      whatsapp_number: string;
      name?: string;
      status?: LeadStatus;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
      toast({ title: 'Lead criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar lead', description: error.message, variant: 'destructive' });
    },
  });

  // Update lead
  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
      toast({ title: 'Lead atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
    },
  });

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
      toast({ title: 'Lead excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir lead', description: error.message, variant: 'destructive' });
    },
  });

  return {
    leads,
    isLoading,
    error,
    stats,
    refetch,
    createLead,
    updateLead,
    deleteLead,
  };
}

export function useLeadTags(tenantId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading, refetch } = useQuery({
    queryKey: ['lead-tags', tenantId],
    queryFn: async () => {
      let query = supabase.from('lead_tags').select('*').order('name');
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LeadTag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (tag: { tenant_id: string; name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('lead_tags')
        .insert(tag)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags'] });
      toast({ title: 'Tag criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar tag', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags'] });
      toast({ title: 'Tag excluída com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir tag', description: error.message, variant: 'destructive' });
    },
  });

  const addTagToLead = useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await supabase
        .from('lead_tag_links')
        .insert({ lead_id: leadId, tag_id: tagId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar tag', description: error.message, variant: 'destructive' });
    },
  });

  const removeTagFromLead = useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await supabase
        .from('lead_tag_links')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover tag', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tags,
    isLoading,
    refetch,
    createTag,
    deleteTag,
    addTagToLead,
    removeTagFromLead,
  };
}

export function useLeadMessages(leadId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as LeadMessage[];
    },
    enabled: !!leadId,
  });

  const addMessage = useMutation({
    mutationFn: async (message: {
      lead_id: string;
      direction: MessageDirection;
      content: string;
      external_message_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('lead_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-messages'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar mensagem', description: error.message, variant: 'destructive' });
    },
  });

  return {
    messages,
    isLoading,
    addMessage,
  };
}
