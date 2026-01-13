import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Calendar, MessageSquare, Building2, Tag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead, LeadTag, LeadMessage, LeadStatus } from '@/hooks/useLeads';

interface LeadDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  tags: LeadTag[];
  messages: LeadMessage[];
}

const statusLabels: Record<LeadStatus, string> = {
  new: 'Novo',
  in_conversation: 'Em conversa',
  not_scheduled: 'Não agendou',
  scheduled: 'Já agendou',
};

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-info/10 text-info border-info/20',
  in_conversation: 'bg-primary/10 text-primary border-primary/20',
  not_scheduled: 'bg-warning/10 text-warning border-warning/20',
  scheduled: 'bg-success/10 text-success border-success/20',
};

export function LeadDetailsDrawer({
  open,
  onOpenChange,
  lead,
  tags,
  messages,
}: LeadDetailsDrawerProps) {
  if (!lead) return null;

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      const ddd = cleaned.slice(2, 4);
      const part1 = cleaned.slice(4, 9);
      const part2 = cleaned.slice(9);
      return `(${ddd}) ${part1}-${part2}`;
    }
    return phone;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{lead.name || 'Lead sem nome'}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-mono">{formatPhone(lead.whatsapp_number)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estabelecimento</p>
                  <p>{lead.tenant?.name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusColors[lead.status]}>
                  {statusLabels[lead.status]}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datas
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Primeiro contato</p>
                  <p>{format(new Date(lead.first_contact_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última interação</p>
                  <p>{format(new Date(lead.last_message_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tag</p>
                ) : (
                  tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color || undefined }}
                    >
                      {tag.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Message History */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Histórico de Mensagens
              </h4>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-primary/10 ml-4'
                          : 'bg-muted mr-4'
                      }`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {msg.direction === 'outbound' ? 'Enviado' : 'Recebido'} em{' '}
                        {format(new Date(msg.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
