import { MessageCircle, Pencil, Phone, CalendarDays, StickyNote, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DEFAULT_COLUMN_LABELS, COLUMN_KEYS_ORDER } from '@/types/lead';
import type { LeadColumnKey } from '@/types/lead';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientLeadCardProps {
  client: Client;
  onEdit: () => void;
  onMove?: (newColumnKey: LeadColumnKey) => void;
}

function sanitizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function ClientLeadCard({ client, onEdit, onMove }: ClientLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    data: { client },
    disabled: !!onMove,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const phone = client.phone ? sanitizePhone(client.phone) : null;
  const whatsappUrl = phone ? `https://wa.me/${phone}` : null;

  const capturedDate = new Date(client.created_at || '').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  const columnKey = (client as any).kanban_column_key as LeadColumnKey;

  return (
    <div ref={setNodeRef} style={style} {...(onMove ? {} : { ...attributes, ...listeners })} className={onMove ? undefined : 'touch-none'}>
      <Card className={`shadow-sm hover:shadow-md transition-shadow ${!onMove ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm leading-tight truncate">
              {client.name || <span className="text-muted-foreground italic">Lead sem nome</span>}
            </p>
            {columnKey === 'convertido' && (
              <Badge variant="secondary" className="text-xs shrink-0">Convertido</Badge>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            {client.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span>Captado em {capturedDate}</span>
            </div>
            {client.notes && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <StickyNote className="h-3 w-3 shrink-0" />
                <span className="truncate">{client.notes}</span>
              </div>
            )}
          </div>

          <div
            className="flex gap-1.5 pt-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {whatsappUrl ? (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs flex-1" asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs flex-1" disabled>
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </Button>
            )}

            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs flex-1" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
              Editar
            </Button>

            {onMove && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs flex-1">
                    <ArrowRight className="h-3 w-3" />
                    Mover
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {COLUMN_KEYS_ORDER.filter((k) => k !== columnKey).map((key) => (
                    <DropdownMenuItem key={key} onClick={() => onMove(key)}>
                      {DEFAULT_COLUMN_LABELS[key]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
