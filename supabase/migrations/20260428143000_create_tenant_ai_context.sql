-- Tabela tenant_ai_context: armazena personalidade, contexto e regras da IA por tenant
CREATE TABLE public.tenant_ai_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Personalidade
  ai_name text DEFAULT 'Atendente',
  ai_tone text DEFAULT 'amigavel' CHECK (ai_tone IN ('formal', 'amigavel', 'tecnico', 'acolhedor')),
  ai_pronouns text DEFAULT 'neutro' CHECK (ai_pronouns IN ('ele', 'ela', 'neutro')),
  ai_emoji_usage text DEFAULT 'moderado' CHECK (ai_emoji_usage IN ('muito', 'moderado', 'nenhum')),

  -- Sobre o negócio
  business_intro text DEFAULT '',
  specialties text[] DEFAULT '{}',
  differentials text[] DEFAULT '{}',
  business_address text DEFAULT '',

  -- Políticas
  cancellation_policy text DEFAULT '',
  rescheduling_policy text DEFAULT '',
  payment_policy text DEFAULT '',
  late_policy text DEFAULT '',

  -- Regras éticas
  ethical_rules text[] DEFAULT ARRAY[
    'Não dar diagnóstico médico',
    'Não recomendar medicação',
    'Não fazer prognóstico'
  ],

  -- Reservados para futuro (schema only, UI não mostra ainda)
  alt_phone text DEFAULT '',
  alt_email text DEFAULT '',
  social_media jsonb DEFAULT '{}'::jsonb,
  escalation_keywords text[] DEFAULT '{}',
  escalation_phone text DEFAULT '',
  faq jsonb DEFAULT '[]'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_context_tenant ON public.tenant_ai_context(tenant_id);

ALTER TABLE public.tenant_ai_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
DROP POLICY IF EXISTS "tenant_select_ai_context" ON public.tenant_ai_context;
CREATE POLICY "tenant_select_ai_context" ON public.tenant_ai_context
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_insert_ai_context" ON public.tenant_ai_context;
CREATE POLICY "tenant_insert_ai_context" ON public.tenant_ai_context
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_update_ai_context" ON public.tenant_ai_context;
CREATE POLICY "tenant_update_ai_context" ON public.tenant_ai_context
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_ai_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_context_updated_at ON public.tenant_ai_context;
CREATE TRIGGER update_ai_context_updated_at
  BEFORE UPDATE ON public.tenant_ai_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_context_updated_at();
