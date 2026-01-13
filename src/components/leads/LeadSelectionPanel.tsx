import { useState } from 'react';
import { X, Send, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { Lead } from '@/hooks/useLeads';

interface LeadSelectionPanelProps {
  selectedLeads: Lead[];
  totalFilteredLeads: number;
  onClearSelection: () => void;
  onSelectAllFiltered: () => void;
  onSendMessage: (message: string, leadIds: string[]) => Promise<void>;
  isSending: boolean;
}

export function LeadSelectionPanel({
  selectedLeads,
  totalFilteredLeads,
  onClearSelection,
  onSelectAllFiltered,
  onSendMessage,
  isSending,
}: LeadSelectionPanelProps) {
  const [message, setMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendType, setSendType] = useState<'selected' | 'filtered'>('selected');

  const charCount = message.length;
  const maxChars = 1000;

  const insertVariable = (variable: string) => {
    setMessage((prev) => prev + variable);
  };

  const handleSendClick = (type: 'selected' | 'filtered') => {
    if (!message.trim()) return;
    setSendType(type);
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = async () => {
    const leadIds = sendType === 'selected' 
      ? selectedLeads.map(l => l.id)
      : []; // Empty means all filtered - backend will handle
    
    await onSendMessage(message, leadIds);
    setMessage('');
    setShowConfirmDialog(false);
  };

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

  if (selectedLeads.length === 0) return null;

  return (
    <>
      <div className="fixed right-0 top-0 z-50 h-screen w-96 border-l bg-card shadow-xl animate-slide-up">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold">{selectedLeads.length} selecionados</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="border-b p-4 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onSelectAllFiltered}
            >
              Selecionar todos do filtro ({totalFilteredLeads})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onClearSelection}
            >
              Limpar seleção
            </Button>
          </div>

          {/* Selected Leads List */}
          <ScrollArea className="flex-1 p-4">
            <p className="text-sm font-medium mb-2">Leads selecionados:</p>
            <div className="space-y-2">
              {selectedLeads.slice(0, 20).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{lead.name || 'Sem nome'}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatPhone(lead.whatsapp_number)}
                    </p>
                  </div>
                </div>
              ))}
              {selectedLeads.length > 20 && (
                <p className="text-center text-sm text-muted-foreground">
                  +{selectedLeads.length - 20} leads
                </p>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Message Editor */}
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Mensagem</p>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={maxChars}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex gap-1">
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => insertVariable('{{nome}}')}
                  >
                    {'{{nome}}'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => insertVariable('{{primeiro_nome}}')}
                  >
                    {'{{primeiro_nome}}'}
                  </Badge>
                </div>
                <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-warning' : 'text-muted-foreground'}`}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                onClick={() => handleSendClick('selected')}
                disabled={!message.trim() || isSending}
              >
                <Send className="h-4 w-4" />
                Enviar para selecionados ({selectedLeads.length})
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleSendClick('filtered')}
                disabled={!message.trim() || isSending}
              >
                <Send className="h-4 w-4" />
                Enviar para todos do filtro ({totalFilteredLeads})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar envio
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar uma mensagem para{' '}
              <strong>
                {sendType === 'selected' ? selectedLeads.length : totalFilteredLeads} leads
              </strong>
              . Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Prévia da mensagem:</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{message}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={isSending}>
              {isSending ? 'Enviando...' : 'Confirmar envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
