import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, MessageCircle, Calendar, Ban, Clock, AlertTriangle, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { cn, formatTimeInSaoPaulo } from '@/lib/utils';
import { useAppointmentCriteria } from '@/hooks/useAppointmentCriteria';
import type { ServiceCriterion } from '@/types/criteria';

interface Props {
  appointment: any;  // tipo herdado de useAppointments
  onConfirm: () => void;
  onDefineQuote: () => void;
  onSuggestSlots: () => void;
  onReject: () => void;
}

// Calcula tempo de espera desde created_at
function calculateWaitTime(createdAt: string): { label: string; level: 'normal' | 'warning' | 'critical' } {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - created) / 60000);

  let label: string;
  if (diffMin < 1) label = 'Agora';
  else if (diffMin < 60) label = `Há ${diffMin}min`;
  else {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    label = mins === 0 ? `Há ${hours}h` : `Há ${hours}h ${mins}min`;
  }

  if (diffMin >= 60) return { label, level: 'critical' };
  if (diffMin >= 30) return { label, level: 'warning' };
  return { label, level: 'normal' };
}

// Sanitiza telefone pra usar no link wa.me
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  // Adiciona 55 se não começar com isso (assume BR)
  return digits.startsWith('55') ? digits : `55${digits}`;
}

// Renderiza valor da resposta de critério baseado no tipo
function renderCriterionValue(criterion: ServiceCriterion, value: string, isCustomAnswer: boolean) {
  switch (criterion.type) {
    case 'boolean':
      return (
        <span className={cn('font-medium', value === 'true' ? 'text-success' : 'text-destructive')}>
          {value === 'true' ? 'Sim' : 'Não'}
        </span>
      );
    case 'photo':
      if (!value) return <span className="text-muted-foreground">Sem foto</span>;
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ImageIcon className="h-3.5 w-3.5" />
          Ver foto
        </a>
      );
    case 'choice':
      return (
        <span className="font-medium">
          {value || '—'}
          {isCustomAnswer && <span className="text-xs text-muted-foreground ml-1">(personalizada)</span>}
        </span>
      );
    case 'number':
      return <span className="font-medium">{value || '—'}</span>;
    default:
      return <span className="font-medium">{value || '—'}</span>;
  }
}

export function PendingAppointmentCard({ appointment, onConfirm, onDefineQuote, onSuggestSlots, onReject }: Props) {
  // Atualiza o timer a cada minuto
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(prev => prev + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Carrega critérios + respostas
  const serviceIds = appointment.appointment_services?.length
    ? appointment.appointment_services.map((as: any) => as.service_id)
    : (appointment.service_id ? [appointment.service_id] : []);

  const { criteria, responsesMap } = useAppointmentCriteria(serviceIds, appointment.id);

  const waitTime = calculateWaitTime(appointment.created_at);
  const phone = sanitizePhone(appointment.clients?.phone);
  const whatsappUrl = phone ? `https://wa.me/${phone}` : null;

  // Nome do(s) serviço(s)
  const serviceNames = appointment.appointment_services?.length
    ? appointment.appointment_services.map((as: any) => as.services?.name).filter(Boolean).join(', ')
    : appointment.services?.name || '—';

  // Data/hora do agendamento
  const apptDate = new Date(appointment.scheduled_at);
  const dateStr = apptDate.toLocaleDateString('pt-BR');
  const timeStr = formatTimeInSaoPaulo(apptDate);

  return (
    <Card className={cn(
      'overflow-hidden transition-colors',
      waitTime.level === 'critical' && 'border-destructive border-2'
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Cliente + Timer */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{appointment.clients?.name || 'Cliente'}</h3>
            {appointment.clients?.phone && (
              <p className="text-xs text-muted-foreground">{appointment.clients.phone}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 whitespace-nowrap',
              waitTime.level === 'normal' && 'bg-muted text-muted-foreground',
              waitTime.level === 'warning' && 'bg-warning/10 text-warning border-warning/30',
              waitTime.level === 'critical' && 'bg-destructive/10 text-destructive border-destructive/30'
            )}
          >
            {waitTime.level === 'critical' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {waitTime.label}
          </Badge>
        </div>

        {/* Info do agendamento */}
        <div className="bg-muted/30 rounded-md p-2.5 text-sm space-y-1">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Serviço:</span>
            <span className="font-medium text-right">{serviceNames}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Data/Hora:</span>
            <span className="font-medium">{dateStr} às {timeStr}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline" className="text-xs">
              {appointment.status === 'suggested' ? 'Horário sugerido' : 'Aguardando orçamento'}
            </Badge>
          </div>
        </div>

        {/* Critérios respondidos */}
        {criteria.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            Este serviço não tem critérios cadastrados.
          </p>
        ) : (
          <div className="border rounded-md p-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              📋 Critérios respondidos
            </p>
            <div className="space-y-1 text-sm">
              {criteria.map(c => {
                const response = responsesMap.get(c.id);
                if (!response) {
                  return (
                    <div key={c.id} className="flex justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{c.label}:</span>
                      <span className="text-muted-foreground italic">não respondido</span>
                    </div>
                  );
                }
                return (
                  <div key={c.id} className="flex justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{c.label}:</span>
                    <div>{renderCriterionValue(c, response.value, response.isCustomAnswer)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" className="gap-1.5 text-success hover:text-success" onClick={onConfirm}>
            <CheckCircle className="h-3.5 w-3.5" />
            Confirmar
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onDefineQuote}>
            <DollarSign className="h-3.5 w-3.5" />
            Orçamento
          </Button>
          {whatsappUrl ? (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" disabled title="Sem telefone cadastrado">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onSuggestSlots}>
            <Calendar className="h-3.5 w-3.5" />
            Sugerir
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={onReject}>
            <Ban className="h-3.5 w-3.5" />
            Rejeitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}