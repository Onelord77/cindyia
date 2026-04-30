import { useState, useMemo } from 'react';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
import { startOfDay, endOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

type Client = Database['public']['Tables']['clients']['Row'];
type DateFilter = 'all' | 'today' | '7days' | '30days' | 'custom';

function computeDateRange(filter: DateFilter, custom: DateRange | undefined): { from?: Date; to?: Date } {
  const today = new Date();
  switch (filter) {
    case 'today':
      return { from: startOfDay(today), to: endOfDay(today) };
    case '7days':
      return { from: startOfDay(subDays(today, 7)), to: endOfDay(today) };
    case '30days':
      return { from: startOfDay(subDays(today, 30)), to: endOfDay(today) };
    case 'custom':
      return {
        from: custom?.from ? startOfDay(custom.from) : undefined,
        to: custom?.to ? endOfDay(custom.to) : undefined,
      };
    default:
      return {};
  }
}

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
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredByDate = useMemo(() => {
    if (dateFilter === 'all') return clients;
    const range = computeDateRange(dateFilter, customRange);
    if (!range.from && !range.to) return clients;
    return clients.filter((c) => {
      const created = new Date(c.created_at || '');
      if (range.from && created < range.from) return false;
      if (range.to && created > range.to) return false;
      return true;
    });
  }, [clients, dateFilter, customRange]);

  const clientsPerColumn = useMemo(
    () =>
      COLUMN_KEYS_ORDER.reduce<Record<LeadColumnKey, Client[]>>(
        (acc, key) => {
          acc[key] = filteredByDate.filter((c) => ((c as any).kanban_column_key ?? 'novo') === key);
          return acc;
        },
        {} as Record<LeadColumnKey, Client[]>
      ),
    [filteredByDate]
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

  function handleQuickFilter(filter: DateFilter) {
    setDateFilter(filter);
    setCustomRange(undefined);
  }

  function handleCustomRange(range: DateRange | undefined) {
    if (range) {
      setCustomRange(range);
      setDateFilter('custom');
    } else {
      setCustomRange(undefined);
      setDateFilter('all');
    }
  }

  const quickFilters: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'Tudo' },
    { key: 'today', label: 'Hoje' },
    { key: '7days', label: '7 dias' },
    { key: '30days', label: '30 dias' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between py-3 shrink-0">
        <p className="text-sm text-muted-foreground">
          {filteredByDate.length} {filteredByDate.length === 1 ? 'lead' : 'leads'} no funil
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['clients', profile?.tenant_id] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtro de data */}
      <div className="flex flex-wrap items-center gap-2 pb-3 shrink-0">
        <span className="text-sm text-muted-foreground shrink-0">Captura:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {quickFilters.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={dateFilter === key ? 'default' : 'outline'}
              onClick={() => handleQuickFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <DateRangePicker
          dateRange={dateFilter === 'custom' ? customRange : undefined}
          onDateRangeChange={handleCustomRange}
          placeholder="Período"
          className="w-auto"
        />
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
