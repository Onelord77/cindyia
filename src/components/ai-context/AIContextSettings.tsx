import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Plus, X } from 'lucide-react';
import { useTenantAIContext } from '@/hooks/useTenantAIContext';
import { TenantAIContext, AITone, AIPronouns, AIEmojiUsage } from '@/types/aiContext';
import { TagInput } from './TagInput';
import { Skeleton } from '@/components/ui/skeleton';

export function AIContextSettings() {
  const { context, isLoading, updateContext } = useTenantAIContext();
  const [form, setForm] = useState<TenantAIContext>(context);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState('');

  useEffect(() => {
    setForm(context);
  }, [context]);

  const update = <K extends keyof TenantAIContext>(key: K, value: TenantAIContext[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addEthicalRule = () => {
    const trimmed = newRule.trim();
    if (trimmed && !form.ethicalRules.includes(trimmed)) {
      update('ethicalRules', [...form.ethicalRules, trimmed]);
    }
    setNewRule('');
  };

  const removeEthicalRule = (index: number) => {
    update('ethicalRules', form.ethicalRules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateContext(form);
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={['personality']} className="space-y-2">

        {/* Seção 1: Personalidade */}
        <AccordionItem value="personality" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            Personalidade do Atendente
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="aiName">Nome do atendente virtual</Label>
              <Input
                id="aiName"
                value={form.aiName}
                onChange={(e) => update('aiName', e.target.value)}
                placeholder="Ex: Camila, Sofia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiTone">Tom de voz</Label>
              <Select value={form.aiTone} onValueChange={(v) => update('aiTone', v as AITone)}>
                <SelectTrigger id="aiTone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="amigavel">Amigável</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="acolhedor">Acolhedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pronomes</Label>
              <RadioGroup
                value={form.aiPronouns}
                onValueChange={(v) => update('aiPronouns', v as AIPronouns)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ele" id="pronoun-ele" />
                  <Label htmlFor="pronoun-ele" className="cursor-pointer font-normal">Ele</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ela" id="pronoun-ela" />
                  <Label htmlFor="pronoun-ela" className="cursor-pointer font-normal">Ela</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="neutro" id="pronoun-neutro" />
                  <Label htmlFor="pronoun-neutro" className="cursor-pointer font-normal">Neutro</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Uso de emojis</Label>
              <RadioGroup
                value={form.aiEmojiUsage}
                onValueChange={(v) => update('aiEmojiUsage', v as AIEmojiUsage)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="muito" id="emoji-muito" />
                  <Label htmlFor="emoji-muito" className="cursor-pointer font-normal">Muito</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="moderado" id="emoji-moderado" />
                  <Label htmlFor="emoji-moderado" className="cursor-pointer font-normal">Moderado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nenhum" id="emoji-nenhum" />
                  <Label htmlFor="emoji-nenhum" className="cursor-pointer font-normal">Nenhum</Label>
                </div>
              </RadioGroup>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 2: Sobre o Negócio */}
        <AccordionItem value="business" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            Sobre o Negócio
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="businessIntro">Apresentação da clínica</Label>
                <span className="text-xs text-muted-foreground">
                  {form.businessIntro.length}/500
                </span>
              </div>
              <Textarea
                id="businessIntro"
                value={form.businessIntro}
                onChange={(e) => {
                  if (e.target.value.length <= 500) update('businessIntro', e.target.value);
                }}
                placeholder="Ex: Somos uma clínica especializada em estética facial e corporal, com atendimento personalizado desde 2015..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Especialidades</Label>
              <TagInput
                tags={form.specialties}
                onChange={(tags) => update('specialties', tags)}
                placeholder="Ex: Limpeza de pele, Botox... (Enter para adicionar)"
              />
            </div>

            <div className="space-y-2">
              <Label>Diferenciais</Label>
              <TagInput
                tags={form.differentials}
                onChange={(tags) => update('differentials', tags)}
                placeholder="Ex: Atendimento humanizado, Equipamentos modernos... (Enter para adicionar)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessAddress">Endereço completo e como chegar</Label>
              <Textarea
                id="businessAddress"
                value={form.businessAddress}
                onChange={(e) => update('businessAddress', e.target.value)}
                placeholder="Ex: Rua das Flores, 123 - Jardim Primavera. Próximo ao Shopping Norte, estacionamento gratuito na rua."
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 3: Políticas */}
        <AccordionItem value="policies" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            Políticas
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="cancellationPolicy">Política de cancelamento</Label>
              <Textarea
                id="cancellationPolicy"
                value={form.cancellationPolicy}
                onChange={(e) => update('cancellationPolicy', e.target.value)}
                placeholder="Ex: Cancelamentos devem ser feitos com pelo menos 24h de antecedência. Após esse prazo, será cobrada uma taxa de 50%..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedulingPolicy">Política de reagendamento</Label>
              <Textarea
                id="reschedulingPolicy"
                value={form.reschedulingPolicy}
                onChange={(e) => update('reschedulingPolicy', e.target.value)}
                placeholder="Ex: Reagendamentos são aceitos com até 12h de antecedência, sujeito à disponibilidade de horário..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentPolicy">Política de pagamento</Label>
              <Textarea
                id="paymentPolicy"
                value={form.paymentPolicy}
                onChange={(e) => update('paymentPolicy', e.target.value)}
                placeholder="Ex: Aceitamos PIX, cartão de crédito (até 6x) e débito. Não aceitamos cheque..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="latePolicy">Política de atrasos</Label>
              <Textarea
                id="latePolicy"
                value={form.latePolicy}
                onChange={(e) => update('latePolicy', e.target.value)}
                placeholder="Ex: Tolerância de 10 minutos de atraso. Após esse tempo, o agendamento pode ser cancelado sem reembolso..."
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 4: Regras Éticas */}
        <AccordionItem value="ethics" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            Regras Éticas
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Defina o que a IA nunca deve fazer ou dizer durante o atendimento.
            </p>

            {form.ethicalRules.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.ethicalRules.map((rule, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 pr-1.5 text-sm">
                    {rule}
                    <button
                      type="button"
                      onClick={() => removeEthicalRule(i)}
                      className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
                      aria-label={`Remover regra: ${rule}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addEthicalRule(); }
                }}
                placeholder="Adicionar nova regra ética..."
              />
              <Button type="button" variant="outline" size="icon" onClick={addEthicalRule} aria-label="Adicionar regra">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <Separator />

      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Contexto da IA
        </Button>
      </div>
    </div>
  );
}
