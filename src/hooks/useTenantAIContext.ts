import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { TenantAIContext, defaultAIContext, AITone, AIPronouns, AIEmojiUsage } from '@/types/aiContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

function toFrontend(row: Record<string, unknown>): TenantAIContext {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    aiName: (row.ai_name as string) ?? defaultAIContext.aiName,
    aiTone: (row.ai_tone as AITone) ?? defaultAIContext.aiTone,
    aiPronouns: (row.ai_pronouns as AIPronouns) ?? defaultAIContext.aiPronouns,
    aiEmojiUsage: (row.ai_emoji_usage as AIEmojiUsage) ?? defaultAIContext.aiEmojiUsage,
    businessIntro: (row.business_intro as string) ?? '',
    specialties: (row.specialties as string[]) ?? [],
    differentials: (row.differentials as string[]) ?? [],
    businessAddress: (row.business_address as string) ?? '',
    cancellationPolicy: (row.cancellation_policy as string) ?? '',
    reschedulingPolicy: (row.rescheduling_policy as string) ?? '',
    paymentPolicy: (row.payment_policy as string) ?? '',
    latePolicy: (row.late_policy as string) ?? '',
    ethicalRules: (row.ethical_rules as string[]) ?? defaultAIContext.ethicalRules,
  };
}

function toDatabase(data: TenantAIContext, tenantId: string): Record<string, unknown> {
  return {
    tenant_id: tenantId,
    ai_name: data.aiName,
    ai_tone: data.aiTone,
    ai_pronouns: data.aiPronouns,
    ai_emoji_usage: data.aiEmojiUsage,
    business_intro: data.businessIntro,
    specialties: data.specialties,
    differentials: data.differentials,
    business_address: data.businessAddress,
    cancellation_policy: data.cancellationPolicy,
    rescheduling_policy: data.reschedulingPolicy,
    payment_policy: data.paymentPolicy,
    late_policy: data.latePolicy,
    ethical_rules: data.ethicalRules,
  };
}

export function useTenantAIContext() {
  const { user } = useAuth();
  const [context, setContext] = useState<TenantAIContext>(defaultAIContext);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) return;

      const tid = profile.tenant_id;
      setTenantId(tid);

      const db = supabase as AnySupabase;
      const { data, error } = await db
        .from('tenant_ai_context')
        .select('*')
        .eq('tenant_id', tid)
        .maybeSingle();

      if (error) {
        toast.error('Erro ao carregar contexto da IA');
        return;
      }

      if (data) {
        setContext(toFrontend(data as Record<string, unknown>));
      } else {
        // Cria registro com defaults para este tenant
        const defaults = toDatabase(defaultAIContext, tid);
        const { data: created, error: insertError } = await db
          .from('tenant_ai_context')
          .insert(defaults)
          .select('*')
          .single();

        if (!insertError && created) {
          setContext(toFrontend(created as Record<string, unknown>));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const updateContext = useCallback(async (data: TenantAIContext): Promise<boolean> => {
    if (!tenantId) {
      toast.error('Tenant não encontrado');
      return false;
    }

    if (!data.aiName.trim()) {
      toast.error('Nome do atendente é obrigatório');
      return false;
    }

    try {
      const db = supabase as AnySupabase;
      const payload = toDatabase(data, tenantId);

      const { error } = await db
        .from('tenant_ai_context')
        .upsert(payload, { onConflict: 'tenant_id' });

      if (error) {
        toast.error('Erro ao salvar contexto da IA');
        return false;
      }

      setContext({ ...data, tenantId });
      toast.success('Contexto da IA salvo com sucesso!');
      return true;
    } catch {
      toast.error('Erro ao salvar contexto da IA');
      return false;
    }
  }, [tenantId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    context,
    isLoading,
    updateContext,
    refetch: fetchContext,
  };
}
