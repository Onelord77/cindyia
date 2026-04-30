import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Pencil, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ClientLeadCard } from './ClientLeadCard';
import { COLUMN_ACCENT } from '@/types/lead';
import type { LeadColumnKey } from '@/types/lead';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];

interface LeadKanbanColumnProps {
  columnKey: LeadColumnKey;
  label: string;
  clients: Client[];
  onLabelEdit: (columnKey: LeadColumnKey, newLabel: string) => void;
  onClientEdit: (client: Client) => void;
}

export function LeadKanbanColumn({ columnKey, label, clients, onLabelEdit, onClientEdit }: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    setEditValue(label);
  }, [label]);

  function handleSave() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onLabelEdit(columnKey, trimmed);
    }
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col w-[260px] shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', COLUMN_ACCENT[columnKey])} />

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              onBlur={handleSave}
              className="h-6 text-sm font-semibold px-1 py-0"
            />
            <button onClick={handleSave} className="text-muted-foreground hover:text-foreground">
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-sm font-semibold truncate">{label}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
              title="Renomear coluna"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}

        <Badge variant="secondary" className="text-xs shrink-0 ml-auto">
          {clients.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-lg p-2 space-y-2 min-h-[120px] transition-colors',
          'bg-muted/30 border border-dashed border-transparent',
          isOver && 'bg-primary/5 border-primary/30'
        )}
      >
        {clients.map((client) => (
          <ClientLeadCard
            key={client.id}
            client={client}
            onEdit={() => onClientEdit(client)}
          />
        ))}

        {clients.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
            Sem leads
          </div>
        )}
      </div>
    </div>
  );
}
