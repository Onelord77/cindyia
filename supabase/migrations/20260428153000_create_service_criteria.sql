-- ============================================================================
-- Tabela service_criteria: critérios cadastrados pela Jeniffer por serviço
-- ============================================================================
CREATE TABLE public.service_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'number', 'choice', 'boolean', 'photo')),
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_service_criteria_service ON public.service_criteria(service_id);
CREATE INDEX idx_service_criteria_tenant ON public.service_criteria(tenant_id);
CREATE INDEX idx_service_criteria_order ON public.service_criteria(service_id, display_order);

ALTER TABLE public.service_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_criteria" ON public.service_criteria;
CREATE POLICY "tenant_select_criteria" ON public.service_criteria
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_insert_criteria" ON public.service_criteria;
CREATE POLICY "tenant_insert_criteria" ON public.service_criteria
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_update_criteria" ON public.service_criteria;
CREATE POLICY "tenant_update_criteria" ON public.service_criteria
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_delete_criteria" ON public.service_criteria;
CREATE POLICY "tenant_delete_criteria" ON public.service_criteria
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_service_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_criteria_updated_at ON public.service_criteria;
CREATE TRIGGER update_service_criteria_updated_at
  BEFORE UPDATE ON public.service_criteria
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_criteria_updated_at();

-- ============================================================================
-- Tabela appointment_criteria_responses: schema para Prompt 3b (não usado ainda)
-- ============================================================================
CREATE TABLE public.appointment_criteria_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.service_criteria(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  answer jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_responses_appointment ON public.appointment_criteria_responses(appointment_id);
CREATE INDEX idx_responses_criterion ON public.appointment_criteria_responses(criterion_id);
CREATE INDEX idx_responses_tenant ON public.appointment_criteria_responses(tenant_id);

ALTER TABLE public.appointment_criteria_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_responses" ON public.appointment_criteria_responses;
CREATE POLICY "tenant_select_responses" ON public.appointment_criteria_responses
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_insert_responses" ON public.appointment_criteria_responses;
CREATE POLICY "tenant_insert_responses" ON public.appointment_criteria_responses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "tenant_update_responses" ON public.appointment_criteria_responses;
CREATE POLICY "tenant_update_responses" ON public.appointment_criteria_responses
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================================================
-- Bucket de storage para fotos dos critérios
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('criteria-photos', 'criteria-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tenant_criteria_photo_upload" ON storage.objects;
CREATE POLICY "tenant_criteria_photo_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'criteria-photos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "tenant_criteria_photo_read_auth" ON storage.objects;
CREATE POLICY "tenant_criteria_photo_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'criteria-photos');

DROP POLICY IF EXISTS "public_criteria_photo_read" ON storage.objects;
CREATE POLICY "public_criteria_photo_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'criteria-photos');

DROP POLICY IF EXISTS "tenant_criteria_photo_delete" ON storage.objects;
CREATE POLICY "tenant_criteria_photo_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'criteria-photos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  );
