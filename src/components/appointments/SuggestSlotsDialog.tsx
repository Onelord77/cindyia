import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppointmentSuggestion } from '@/hooks/useAppointmentSuggestion';
import { getTodayInSaoPaulo } from '@/lib/utils';
import type { AppointmentSuggestionSlot } from '@/types/appointment-suggestion';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}

const emptySlot = (): AppointmentSuggestionSlot => ({ date: '', time: '' });

export function SuggestSlotsDialog({ open, onOpenChange, appointmentId }: Props) {
  const [slots, setSlots] = useState<AppointmentSuggestionSlot[]>([emptySlot()]);
  const [observation, setObservation] = useState('');
  const { createSuggestion } = useAppointmentSuggestion();

  const today = getTodayInSaoPaulo();

  const handleSlotChange = (index: number, field: keyof AppointmentSuggestionSlot, value: string) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSlot = () => {
    if (slots.length < 3) setSlots(prev => [...prev, emptySlot()]);
  };

  const removeSlot = (index: number) => {
    if (slots.length === 1) return;
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    const filled = slots.filter(s => s.date && s.time);
    if (filled.length === 0) return 'Preencha pelo menos um horário alternativo.';

    for (const s of filled) {
      if (s.date < today) return 'Todas as datas devem ser futuras (hoje ou depois).';
    }

    const keys = filled.map(s => `${s.date}|${s.time}`);
    if (new Set(keys).size !== keys.length) return 'Não é permitido inserir horários duplicados.';

    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const filledSlots = slots.filter(s => s.date && s.time);
    await createSuggestion.mutateAsync({ appointmentId, suggestedSlots: filledSlots, observation: observation.trim() || undefined });

    if (!createSuggestion.isError) {
      handleClose();
    }
  };

  const handleClose = () => {
    setSlots([emptySlot()]);
    setObservation('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Sugerir horários alternativos</DialogTitle>
          <DialogDescription>
            Ofereça até 3 opções de data e hora para o cliente escolher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {slots.map((slot, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Opção {index + 1}</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={slot.date}
                    min={today}
                    onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={slot.time}
                    onChange={(e) => handleSlotChange(index, 'time', e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
              {slots.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSlot(index)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {slots.length < 3 && (
            <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={addSlot} type="button">
              <Plus className="h-3.5 w-3.5" />
              Adicionar opção
            </Button>
          )}

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="suggestion-obs" className="text-sm">Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              id="suggestion-obs"
              placeholder="Ex: O horário solicitado está ocupado, mas podemos atendê-la nessas opções."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createSuggestion.isPending}>
            {createSuggestion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar sugestão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
