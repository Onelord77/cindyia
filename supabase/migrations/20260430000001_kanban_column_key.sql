-- Limpeza: tabelas criadas no Prompt 6 (vazias, sem dados reais)
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.lead_column_labels CASCADE;

-- Nova coluna em clients para posição no Kanban
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS kanban_column_key text NOT NULL DEFAULT 'novo';

-- Constraint idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'valid_kanban_column_key'
      AND table_name = 'clients'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT valid_kanban_column_key
      CHECK (kanban_column_key IN (
        'novo','em_conversa','aguardando_resposta','em_negociacao','convertido','perdido'
      ));
  END IF;
END $$;

-- Tabela de labels customizados por tenant (recriada)
CREATE TABLE IF NOT EXISTS public.lead_column_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  custom_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, column_key),
  CONSTRAINT valid_column_key_labels CHECK (
    column_key IN ('novo','em_conversa','aguardando_resposta','em_negociacao','convertido','perdido')
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_column_labels_tenant_id
  ON public.lead_column_labels(tenant_id);

ALTER TABLE public.lead_column_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_labels" ON public.lead_column_labels FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_labels" ON public.lead_column_labels FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_labels" ON public.lead_column_labels FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION update_lead_column_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_column_labels_updated_at
  BEFORE UPDATE ON public.lead_column_labels
  FOR EACH ROW EXECUTE FUNCTION update_lead_column_labels_updated_at();
