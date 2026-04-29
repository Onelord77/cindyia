-- Tabela para contexto de IA por serviço
CREATE TABLE IF NOT EXISTS public.service_ai_context (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id          uuid        NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  description         text        NOT NULL DEFAULT '',
  indications         text        NOT NULL DEFAULT '',
  contraindications   text        NOT NULL DEFAULT '',
  post_procedure_care text        NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_service_ai_context_service_id
  ON public.service_ai_context(service_id);

CREATE INDEX IF NOT EXISTS idx_service_ai_context_tenant_id
  ON public.service_ai_context(tenant_id);

-- RLS
ALTER TABLE public.service_ai_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ai context of their tenant services"
  ON public.service_ai_context FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert ai context for their tenant services"
  ON public.service_ai_context FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update ai context of their tenant services"
  ON public.service_ai_context FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_service_ai_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_ai_context_updated_at
  BEFORE UPDATE ON public.service_ai_context
  FOR EACH ROW
  EXECUTE FUNCTION update_service_ai_context_updated_at();
