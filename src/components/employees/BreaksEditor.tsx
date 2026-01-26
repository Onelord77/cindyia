import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coffee, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface BreakPeriod {
  id: string;
  start: string;
  end: string;
  label?: string;
}

export interface BreaksConfig {
  breaks: BreakPeriod[];
}

interface BreaksEditorProps {
  value: BreaksConfig;
  onChange: (value: BreaksConfig) => void;
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

// Validate and normalize time format HH:MM
const isValidTimeFormat = (time: string | undefined): boolean => {
  return !!time && /^\d{2}:\d{2}$/.test(time);
};

export function BreaksEditor({ value, onChange, workingHoursStart = '09:00', workingHoursEnd = '18:00' }: BreaksEditorProps) {
  const [error, setError] = useState<string | null>(null);

  // Ensure we have valid working hours - fallback to safe defaults
  const safeWorkingHoursStart = isValidTimeFormat(workingHoursStart) ? workingHoursStart : '09:00';
  const safeWorkingHoursEnd = isValidTimeFormat(workingHoursEnd) ? workingHoursEnd : '18:00';

  const breaks = value.breaks || [];

  const validateBreak = (newBreak: BreakPeriod, existingBreaks: BreakPeriod[], excludeId?: string): string | null => {
    const [startH, startM] = newBreak.start.split(':').map(Number);
    const [endH, endM] = newBreak.end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    // Validate start is before end
    if (startMins >= endMins) {
      return 'Horário de início deve ser anterior ao horário de término';
    }

    // Validate within working hours
    const [whStartH, whStartM] = safeWorkingHoursStart.split(':').map(Number);
    const [whEndH, whEndM] = safeWorkingHoursEnd.split(':').map(Number);
    const whStartMins = whStartH * 60 + whStartM;
    const whEndMins = whEndH * 60 + whEndM;

    if (startMins < whStartMins || endMins > whEndMins) {
      return `Intervalo deve estar dentro do horário de trabalho (${safeWorkingHoursStart} - ${safeWorkingHoursEnd})`;
    }

    // Check for overlaps with other breaks
    for (const existingBreak of existingBreaks) {
      if (excludeId && existingBreak.id === excludeId) continue;

      const [exStartH, exStartM] = existingBreak.start.split(':').map(Number);
      const [exEndH, exEndM] = existingBreak.end.split(':').map(Number);
      const exStartMins = exStartH * 60 + exStartM;
      const exEndMins = exEndH * 60 + exEndM;

      // Check overlap
      if (startMins < exEndMins && endMins > exStartMins) {
        return 'Este intervalo conflita com outro já existente';
      }
    }

    return null;
  };

  const addBreak = () => {
    // Find a reasonable default time (middle of working hours, 1 hour)
    const [startH, startM] = safeWorkingHoursStart.split(':').map(Number);
    const [endH, endM] = safeWorkingHoursEnd.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const middleMins = Math.floor((startMins + endMins) / 2);
    
    const newBreakStart = `${Math.floor(middleMins / 60).toString().padStart(2, '0')}:${(middleMins % 60).toString().padStart(2, '0')}`;
    const newBreakEndMins = Math.min(middleMins + 60, endMins);
    const newBreakEnd = `${Math.floor(newBreakEndMins / 60).toString().padStart(2, '0')}:${(newBreakEndMins % 60).toString().padStart(2, '0')}`;

    const newBreak: BreakPeriod = {
      id: generateId(),
      start: newBreakStart,
      end: newBreakEnd,
      label: 'Intervalo',
    };

    const validationError = validateBreak(newBreak, breaks);
    setError(validationError);

    onChange({ breaks: [...breaks, newBreak] });
  };

  const updateBreak = (id: string, field: 'start' | 'end' | 'label', value: string) => {
    const updatedBreaks = breaks.map(b => {
      if (b.id === id) {
        return { ...b, [field]: value };
      }
      return b;
    });

    // Validate on time changes
    if (field === 'start' || field === 'end') {
      const updatedBreak = updatedBreaks.find(b => b.id === id);
      if (updatedBreak) {
        const validationError = validateBreak(updatedBreak, breaks, id);
        setError(validationError);
      }
    }

    onChange({ breaks: updatedBreaks });
  };

  const removeBreak = (id: string) => {
    setError(null);
    onChange({ breaks: breaks.filter(b => b.id !== id) });
  };

  // Sort breaks by start time for display
  const sortedBreaks = [...breaks].sort((a, b) => {
    const [aH, aM] = a.start.split(':').map(Number);
    const [bH, bM] = b.start.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Coffee className="h-4 w-4" />
          Intervalos (opcional)
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addBreak} className="gap-1">
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Configure os horários de intervalo do profissional. Durante esses períodos, nenhum agendamento será realizado.
      </p>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {breaks.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhum intervalo configurado
        </div>
      ) : (
        <ScrollArea className="max-h-[200px] rounded-md border">
          <div className="space-y-2 p-3">
            {sortedBreaks.map((breakItem) => (
              <div 
                key={breakItem.id}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
              >
                <Input
                  type="text"
                  value={breakItem.label || ''}
                  onChange={(e) => updateBreak(breakItem.id, 'label', e.target.value)}
                  placeholder="Descrição"
                  className="w-24 h-8 text-sm"
                />
                <Input
                  type="time"
                  value={breakItem.start}
                  onChange={(e) => updateBreak(breakItem.id, 'start', e.target.value)}
                  min={safeWorkingHoursStart}
                  max={safeWorkingHoursEnd}
                  className="w-28 h-8 text-sm"
                />
                <span className="text-muted-foreground text-sm">até</span>
                <Input
                  type="time"
                  value={breakItem.end}
                  onChange={(e) => updateBreak(breakItem.id, 'end', e.target.value)}
                  min={safeWorkingHoursStart}
                  max={safeWorkingHoursEnd}
                  className="w-28 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeBreak(breakItem.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export function formatBreaksSummary(breaks: BreakPeriod[] | null | undefined): string {
  if (!breaks || breaks.length === 0) return 'Sem intervalos';
  if (breaks.length === 1) return `1 intervalo (${breaks[0].start} - ${breaks[0].end})`;
  return `${breaks.length} intervalos`;
}
