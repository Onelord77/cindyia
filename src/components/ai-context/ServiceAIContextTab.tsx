import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save } from 'lucide-react';
import { useServiceAIContext } from '@/hooks/useServiceAIContext';
import type { ServiceAIContextInput } from '@/types/service-ai-context';
import { defaultServiceAIContext } from '@/types/service-ai-context';

interface ServiceAIContextTabProps {
  serviceId: string;
}

export function ServiceAIContextTab({ serviceId }: ServiceAIContextTabProps) {
  const { context, isLoading, isSaving, saveContext } = useServiceAIContext(serviceId);
  const [form, setForm] = useState<ServiceAIContextInput>(defaultServiceAIContext);

  useEffect(() => {
    setForm(context);
  }, [context]);

  const handleSave = async () => {
    await saveContext(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <h3 className="font-semibold">Contexto da IA para este serviço</h3>
        <p className="text-sm text-muted-foreground">
          Informações que a IA usa ao responder clientes sobre este serviço específico.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saic-description">Descrição do serviço</Label>
        <p className="text-xs text-muted-foreground">Como você descreveria este serviço para um cliente?</p>
        <Textarea
          id="saic-description"
          placeholder="Ex: O alongamento de cílios fio a fio proporciona um olhar volumoso e natural, sem necessidade de máscara..."
          className="resize-none h-24"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saic-indications">Indicações</Label>
        <p className="text-xs text-muted-foreground">Para quem este serviço é recomendado?</p>
        <Textarea
          id="saic-indications"
          placeholder="Ex: Ideal para clientes que buscam praticidade no dia a dia e desejam valorizar o olhar sem maquiagem..."
          className="resize-none h-20"
          value={form.indications}
          onChange={(e) => setForm(prev => ({ ...prev, indications: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saic-contraindications">Contraindicações</Label>
        <p className="text-xs text-muted-foreground">Quem NÃO deve fazer? (gestantes, alergias, condições médicas, etc.)</p>
        <Textarea
          id="saic-contraindications"
          placeholder="Ex: Não recomendado para gestantes, clientes com alergia a cola de cianoacrilato ou doenças nos olhos..."
          className="resize-none h-20"
          value={form.contraindications}
          onChange={(e) => setForm(prev => ({ ...prev, contraindications: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saic-post-care">Cuidados pós-procedimento</Label>
        <p className="text-xs text-muted-foreground">Recomendações após o serviço (ex: não molhar 24h, evitar sol, etc.)</p>
        <Textarea
          id="saic-post-care"
          placeholder="Ex: Evitar molhar os cílios nas primeiras 24h, não usar rímel à prova d'água, higienizar com escovinha diariamente..."
          className="resize-none h-20"
          value={form.postProcedureCare}
          onChange={(e) => setForm(prev => ({ ...prev, postProcedureCare: e.target.value }))}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar contexto
        </Button>
      </div>
    </div>
  );
}
