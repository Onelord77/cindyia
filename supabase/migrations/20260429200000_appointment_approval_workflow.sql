-- 1. notification_config em tenants (preparação para integração WhatsApp via n8n)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS notification_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. cancellation_reason em appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 3. Adicionar valor 'suggested' ao enum appointment_status (protegido contra re-execução)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'suggested'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
  ) THEN
    ALTER TYPE public.appointment_status ADD VALUE 'suggested';
  END IF;
END $$;

-- 4. Tabela de sugestões de horário alternativo
CREATE TABLE IF NOT EXISTS public.appointment_suggestions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id)      ON DELETE CASCADE,
  suggested_slots jsonb       NOT NULL,
  observation     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_suggestions_appointment_id
  ON public.appointment_suggestions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appt_suggestions_tenant_id
  ON public.appointment_suggestions(tenant_id);

-- RLS
ALTER TABLE public.appointment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_suggestions"
  ON public.appointment_suggestions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_suggestions"
  ON public.appointment_suggestions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
