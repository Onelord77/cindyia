import { useState, useRef, useEffect } from 'react';
import { Pencil, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ClientLeadCard } from './ClientLeadCard';
import { COLUMN_ACCENT } from '@/types/lead';
import type { LeadColumnKey } from '@/types/lead';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];

interface LeadKanbanMobileSectionProps {
  columnKey: LeadColumnKey;
  label: string;
  clients: Client[];
  onLabelEdit: (columnKey: LeadColumnKey, newLabel: string) => void;
  onClientEdit: (client: Client) => void;
  onMove: (clientId: string, newColumnKey: LeadColumnKey) => void;
}

export function LeadKanbanMobileSection({
  columnKey,
  label,
  clients,
  onLabelEdit,
  onClientEdit,
  onMove,
}: LeadKanbanMobileSectionProps) {
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
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 py-2 border-b">
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

      {clients.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 px-1 py-2">Sem leads nesta coluna</p>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientLeadCard
              key={client.id}
              client={client}
              onEdit={() => onClientEdit(client)}
              onMove={(newColumnKey) => onMove(client.id, newColumnKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
