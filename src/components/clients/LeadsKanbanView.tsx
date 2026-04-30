import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanMobileSection } from './LeadKanbanMobileSection';
import { ClientLeadCard } from './ClientLeadCard';
import { useLeadKanban } from '@/hooks/useLeadKanban';
import { useLeadColumnLabels } from '@/hooks/useLeadColumnLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { COLUMN_KEYS_ORDER } from '@/types/lead';
import type { LeadColumnKey } from '@/types/lead';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];

interface LeadsKanbanViewProps {
  clients: Client[];
  onEditClient: (client: Client) => void;
}

export function LeadsKanbanView({ clients, onEditClient }: LeadsKanbanViewProps) {
  const isMobile = useIsMobile();
  const { moveToColumn, convertToClient } = useLeadKanban();
  const { labels, updateLabel } = useLeadColumnLabels();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [confirmConvert, setConfirmConvert] = useState<{ clientId: string; targetColumn: LeadColumnKey } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const clientsPerColumn = COLUMN_KEYS_ORDER.reduce<Record<LeadColumnKey, Client[]>>(
    (acc, key) => {
      acc[key] = clients.filter((c) => ((c as any).kanban_column_key ?? 'novo') === key);
      return acc;
    },
    {} as Record<LeadColumnKey, Client[]>
  );

  function handleDragStart(event: DragStartEvent) {
    const client = clients.find((c) => c.id === event.active.id);
    setActiveClient(client ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveClient(null);
    const { active, over } = event;
    if (!over) return;

    const clientId = active.id as string;
    const newColumnKey = over.id as LeadColumnKey;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const currentColumn = ((client as any).kanban_column_key ?? 'novo') as LeadColumnKey;
    if (currentColumn === newColumnKey) return;

    if (newColumnKey === 'convertido') {
      setConfirmConvert({ clientId, targetColumn: newColumnKey });
    } else {
      moveToColumn.mutate({ clientId, columnKey: newColumnKey });
    }
  }

  function handleMobileMove(clientId: string, newColumnKey: LeadColumnKey) {
    if (newColumnKey === 'convertido') {
      setConfirmConvert({ clientId, targetColumn: newColumnKey });
    } else {
      moveToColumn.mutate({ clientId, columnKey: newColumnKey });
    }
  }

  function handleLabelEdit(columnKey: LeadColumnKey, newLabel: string) {
    updateLabel.mutate({ columnKey, customLabel: newLabel });
  }

  function handleConfirmConvert() {
    if (!confirmConvert) return;
    convertToClient.mutate(confirmConvert.clientId);
    setConfirmConvert(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between py-3 shrink-0">
        <p className="text-sm text-muted-foreground">
          {clients.length} {clients.length === 1 ? 'lead' : 'leads'} no funil
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['clients', profile?.tenant_id] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Kanban */}
      {isMobile ? (
        <div className="space-y-6 pb-6">
          {COLUMN_KEYS_ORDER.map((key) => (
            <LeadKanbanMobileSection
              key={key}
              columnKey={key}
              label={labels[key]}
              clients={clientsPerColumn[key]}
              onLabelEdit={handleLabelEdit}
              onClientEdit={onEditClient}
              onMove={handleMobileMove}
            />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 pb-6 h-full" style={{ minWidth: 'max-content' }}>
              {COLUMN_KEYS_ORDER.map((key) => (
                <LeadKanbanColumn
                  key={key}
                  columnKey={key}
                  label={labels[key]}
                  clients={clientsPerColumn[key]}
                  onLabelEdit={handleLabelEdit}
                  onClientEdit={onEditClient}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeClient ? (
              <div className="rotate-2 opacity-90">
                <ClientLeadCard client={activeClient} onEdit={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal confirmação: converter lead → cliente */}
      <AlertDialog open={!!confirmConvert} onOpenChange={(open) => !open && setConfirmConvert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter em cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Mover para "Convertido" irá marcar este lead como cliente. Ele deixará de aparecer no funil de leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConvert}>
              Converter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
