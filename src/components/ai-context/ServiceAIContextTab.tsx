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

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 py-2">
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
    <div className="space-y-3 py-2">
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">Contexto da IA para este serviço</h3>
        <p className="text-xs text-muted-foreground">
          Informações que a IA usa ao responder clientes sobre este serviço.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Coluna esquerda: Descrição */}
        <div className="space-y-1.5">
          <Label htmlFor="saic-description" className="text-xs font-medium">Descrição do serviço</Label>
          <p className="text-xs text-muted-foreground">Como você descreveria este serviço para um cliente?</p>
          <Textarea
            id="saic-description"
            placeholder="Ex: Remoção de verrugas por eletrocauterização..."
            className="resize-none h-[220px] text-sm"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Coluna direita: 3 campos empilhados */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="saic-indications" className="text-xs font-medium">Indicações</Label>
            <p className="text-xs text-muted-foreground">Para quem é recomendado?</p>
            <Textarea
              id="saic-indications"
              placeholder="Ex: Ideal para clientes que buscam praticidade..."
              className="resize-none h-[60px] text-sm"
              value={form.indications}
              onChange={(e) => setForm(prev => ({ ...prev, indications: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="saic-contraindications" className="text-xs font-medium">Contraindicações</Label>
            <p className="text-xs text-muted-foreground">Quem NÃO deve fazer?</p>
            <Textarea
              id="saic-contraindications"
              placeholder="Ex: Não recomendado para gestantes..."
              className="resize-none h-[60px] text-sm"
              value={form.contraindications}
              onChange={(e) => setForm(prev => ({ ...prev, contraindications: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="saic-post-care" className="text-xs font-medium">Cuidados pós-procedimento</Label>
            <p className="text-xs text-muted-foreground">Recomendações após o serviço.</p>
            <Textarea
              id="saic-post-care"
              placeholder="Ex: Evitar molhar nas primeiras 24h..."
              className="resize-none h-[60px] text-sm"
              value={form.postProcedureCare}
              onChange={(e) => setForm(prev => ({ ...prev, postProcedureCare: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={() => saveContext(form)} disabled={isSaving} size="sm" className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar contexto
        </Button>
      </div>
    </div>
  );
}
