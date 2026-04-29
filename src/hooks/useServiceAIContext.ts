import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { ServiceAIContext, ServiceAIContextInput } from '@/types/service-ai-context';
import { defaultServiceAIContext } from '@/types/service-ai-context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

function toFrontend(row: Record<string, unknown>): ServiceAIContext {
  return {
    id: row.id as string,
    serviceId: row.service_id as string,
    tenantId: row.tenant_id as string,
    description: (row.description as string) ?? '',
    indications: (row.indications as string) ?? '',
    contraindications: (row.contraindications as string) ?? '',
    postProcedureCare: (row.post_procedure_care as string) ?? '',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useServiceAIContext(serviceId: string | null | undefined) {
  const { user } = useAuth();
  const [context, setContext] = useState<ServiceAIContextInput>(defaultServiceAIContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!user?.id || !serviceId) return;

    try {
      setIsLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) return;

      setTenantId(profile.tenant_id);

      const db = supabase as AnySupabase;
      const { data, error } = await db
        .from('service_ai_context')
        .select('*')
        .eq('service_id', serviceId)
        .maybeSingle();

      if (error) {
        toast.error('Erro ao carregar contexto da IA do serviço');
        return;
      }

      if (data) {
        const mapped = toFrontend(data as Record<string, unknown>);
        setContext({
          description: mapped.description,
          indications: mapped.indications,
          contraindications: mapped.contraindications,
          postProcedureCare: mapped.postProcedureCare,
        });
      } else {
        setContext(defaultServiceAIContext);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, serviceId]);

  const saveContext = useCallback(async (input: ServiceAIContextInput): Promise<boolean> => {
    if (!serviceId || !tenantId) {
      toast.error('Serviço ou tenant não encontrado');
      return false;
    }

    try {
      setIsSaving(true);

      const db = supabase as AnySupabase;
      const { error } = await db.from('service_ai_context').upsert(
        {
          service_id: serviceId,
          tenant_id: tenantId,
          description: input.description,
          indications: input.indications,
          contraindications: input.contraindications,
          post_procedure_care: input.postProcedureCare,
        },
        { onConflict: 'service_id' }
      );

      if (error) {
        toast.error('Erro ao salvar contexto da IA');
        return false;
      }

      setContext(input);
      toast.success('Contexto da IA salvo com sucesso!');
      return true;
    } catch {
      toast.error('Erro ao salvar contexto da IA');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [serviceId, tenantId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { context, isLoading, isSaving, saveContext };
}
