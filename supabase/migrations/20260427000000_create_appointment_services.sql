-- Tabela de serviços vinculados a agendamentos (relação N:N com employee por serviço)
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service ON public.appointment_services(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_employee ON public.appointment_services(employee_id);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view appointment_services"
ON public.appointment_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Tenant members can insert appointment_services"
ON public.appointment_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Tenant members can update appointment_services"
ON public.appointment_services
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Tenant members can delete appointment_services"
ON public.appointment_services
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);
