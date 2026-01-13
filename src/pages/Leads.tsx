import { useState, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLeads, useLeadTags, useLeadMessages, Lead, LeadStatus, LeadTag } from '@/hooks/useLeads';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  LeadFilters,
  LeadStatsCards,
  LeadTable,
  LeadSelectionPanel,
  LeadTagsDialog,
  LeadDetailsDrawer,
} from '@/components/leads';

export default function Leads() {
  const { toast } = useToast();

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog/Drawer state
  const [tagsDialogLead, setTagsDialogLead] = useState<Lead | null>(null);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);

  // Sending state
  const [isSending, setIsSending] = useState(false);

  // Fetch data
  const { leads, isLoading, stats, refetch } = useLeads({
    status: statusFilter,
    tagIds: selectedTagIds,
    search,
    tenantId: tenantFilter || undefined,
  });

  const { tags, createTag, addTagToLead, removeTagFromLead } = useLeadTags();
  const { messages } = useLeadMessages(detailsLead?.id);

  // Get unique tenants from leads
  const tenants = useMemo(() => {
    const tenantsMap = new Map<string, { id: string; name: string }>();
    leads.forEach(lead => {
      if (lead.tenant) {
        tenantsMap.set(lead.tenant.id, lead.tenant);
      }
    });
    return Array.from(tenantsMap.values());
  }, [leads]);

  // Get selected leads
  const selectedLeads = useMemo(() => {
    return leads.filter(l => selectedIds.includes(l.id));
  }, [leads, selectedIds]);

  // Get lead tags for dialog
  const leadTagsForDialog = useMemo(() => {
    if (!tagsDialogLead) return [];
    const lead = leads.find(l => l.id === tagsDialogLead.id);
    return (lead?.tags || []) as LeadTag[];
  }, [tagsDialogLead, leads]);

  // Get lead tags for drawer
  const leadTagsForDrawer = useMemo(() => {
    if (!detailsLead) return [];
    const lead = leads.find(l => l.id === detailsLead.id);
    return (lead?.tags || []) as LeadTag[];
  }, [detailsLead, leads]);

  // Handle message sending
  const handleSendMessage = async (message: string, leadIds: string[]) => {
    setIsSending(true);
    try {
      // If leadIds is empty, send to all filtered leads
      const targetIds = leadIds.length > 0 ? leadIds : leads.map(l => l.id);
      
      const { data, error } = await supabase.functions.invoke('lead-broadcast', {
        body: { leadIds: targetIds, message },
      });

      if (error) throw error;

      toast({
        title: 'Mensagens enviadas!',
        description: `${data?.sent || 0} mensagens enviadas com sucesso.`,
      });

      setSelectedIds([]);
      refetch();
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      toast({
        title: 'Erro ao enviar mensagens',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle create tag
  const handleCreateTag = async (name: string, color: string) => {
    if (!tagsDialogLead?.tenant_id) return;
    
    try {
      await createTag.mutateAsync({
        tenant_id: tagsDialogLead.tenant_id,
        name,
        color,
      });
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  // Handle select all filtered
  const handleSelectAllFiltered = () => {
    setSelectedIds(leads.map(l => l.id));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Leads (WhatsApp)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie contatos do WhatsApp e envie mensagens segmentadas
          </p>
        </div>

        {/* Stats */}
        <LeadStatsCards
          total={stats?.total || 0}
          notScheduled={stats?.notScheduled || 0}
          scheduled={stats?.scheduled || 0}
        />

        {/* Filters */}
        <LeadFilters
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
          tags={tags}
          tenantId={tenantFilter}
          onTenantChange={setTenantFilter}
          tenants={tenants}
        />

        {/* Table */}
        <LeadTable
          leads={leads}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onEditTags={setTagsDialogLead}
          onViewDetails={setDetailsLead}
        />

        {/* Selection Panel */}
        <LeadSelectionPanel
          selectedLeads={selectedLeads}
          totalFilteredLeads={leads.length}
          onClearSelection={() => setSelectedIds([])}
          onSelectAllFiltered={handleSelectAllFiltered}
          onSendMessage={handleSendMessage}
          isSending={isSending}
        />

        {/* Tags Dialog */}
        <LeadTagsDialog
          open={!!tagsDialogLead}
          onOpenChange={(open) => !open && setTagsDialogLead(null)}
          lead={tagsDialogLead}
          allTags={tags.filter(t => t.tenant_id === tagsDialogLead?.tenant_id)}
          leadTags={leadTagsForDialog}
          onAddTag={(leadId, tagId) => addTagToLead.mutate({ leadId, tagId })}
          onRemoveTag={(leadId, tagId) => removeTagFromLead.mutate({ leadId, tagId })}
          onCreateTag={handleCreateTag}
        />

        {/* Details Drawer */}
        <LeadDetailsDrawer
          open={!!detailsLead}
          onOpenChange={(open) => !open && setDetailsLead(null)}
          lead={detailsLead}
          tags={leadTagsForDrawer}
          messages={messages}
        />
      </div>
    </MainLayout>
  );
}
