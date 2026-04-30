-- Tabela leads: gestão de leads no Kanban
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  column_key text NOT NULL DEFAULT 'novo',
  notes text,
  source text,
  converted_to_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_column_key CHECK (
    column_key IN ('novo','em_conversa','aguardando_resposta','em_negociacao','convertido','perdido')
  )
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_column_key ON public.leads(column_key);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_leads" ON public.leads FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_leads" ON public.leads FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_leads" ON public.leads FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_delete_leads" ON public.leads FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

-- Tabela lead_column_labels: labels customizados de colunas por tenant
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

CREATE INDEX IF NOT EXISTS idx_lead_column_labels_tenant_id ON public.lead_column_labels(tenant_id);

ALTER TABLE public.lead_column_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_labels" ON public.lead_column_labels FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_labels" ON public.lead_column_labels FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_update_labels" ON public.lead_column_labels FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
