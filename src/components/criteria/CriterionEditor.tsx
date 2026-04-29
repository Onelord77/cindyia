import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Loader2 } from 'lucide-react';
import {
  type CriterionInput,
  type CriterionType,
  CRITERION_TYPE_LABELS,
  defaultCriterionInput,
} from '@/types/criteria';
import type { ServiceCriterion } from '@/types/criteria';
import { toast } from 'sonner';

interface CriterionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ServiceCriterion | null;
  onSave: (input: CriterionInput) => Promise<void>;
  isSaving?: boolean;
}

const CRITERION_TYPES: CriterionType[] = ['text', 'number', 'choice', 'boolean', 'photo'];

export function CriterionEditor({
  open,
  onOpenChange,
  initial,
  onSave,
  isSaving = false,
}: CriterionEditorProps) {
  const [form, setForm] = useState<CriterionInput>(defaultCriterionInput);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              label: initial.label,
              type: initial.type,
              options: initial.options.length > 0 ? initial.options : ['', ''],
              isRequired: initial.isRequired,
              allowCustomAnswer: initial.allowCustomAnswer,
            }
          : { ...defaultCriterionInput, options: [] }
      );
    }
  }, [open, initial]);

  const handleTypeChange = (type: CriterionType) => {
    setForm(prev => ({
      ...prev,
      type,
      options: type === 'choice' ? (prev.options.length >= 2 ? prev.options : ['', '']) : [],
      // Se mudou pra um tipo que não é choice, força allowCustomAnswer = false
      allowCustomAnswer: type === 'choice' ? prev.allowCustomAnswer : false,
    }));
  };

  const setOption = (index: number, value: string) => {
    setForm(prev => {
      const next = [...prev.options];
      next[index] = value;
      return { ...prev, options: next };
    });
  };

  const addOption = () => {
    if (form.options.length >= 10) return;
    setForm(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('A pergunta é obrigatória');
      return;
    }
    if (form.type === 'choice') {
      const valid = form.options.filter(o => o.trim());
      if (valid.length < 2) {
        toast.error('Múltipla escolha precisa de pelo menos 2 opções');
        return;
      }
    }
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Critério' : 'Novo Critério'}</DialogTitle>
          <DialogDescription>
            {initial
              ? 'Atualize a pergunta de agendamento'
              : 'Adicione uma pergunta que o cliente responde ao agendar'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="criterion-label">Pergunta *</Label>
            <Input
              id="criterion-label"
              placeholder="Ex: Você tem alergia a algum produto?"
              value={form.label}
              onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="criterion-type">Tipo de resposta</Label>
            <Select value={form.type} onValueChange={v => handleTypeChange(v as CriterionType)}>
              <SelectTrigger id="criterion-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITERION_TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    {CRITERION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.type === 'choice' && (
            <div className="space-y-2">
              <Label>Opções (mín. 2, máx. 10)</Label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Opção ${i + 1}`}
                      value={opt}
                      onChange={e => setOption(i, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(i)}
                      disabled={form.options.length <= 2}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {form.options.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar opção
                </Button>
              )}
            </div>
          )}

          {form.type === 'choice' && (
            <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
              <Switch
                id="criterion-allow-custom"
                checked={form.allowCustomAnswer}
                onCheckedChange={v => setForm(prev => ({ ...prev, allowCustomAnswer: v }))}
              />
              <div>
                <Label htmlFor="criterion-allow-custom" className="cursor-pointer font-medium">
                  Permitir resposta personalizada ("Outro")
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cliente pode escolher uma das opções OU digitar uma resposta livre.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
            <Switch
              id="criterion-required"
              checked={form.isRequired}
              onCheckedChange={v => setForm(prev => ({ ...prev, isRequired: v }))}
            />
            <Label htmlFor="criterion-required" className="cursor-pointer">
              Obrigatório
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}