-- Create employee_services junction table (N:N relationship)
CREATE TABLE public.employee_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, service_id)
);

-- Indexes for performance
CREATE INDEX idx_employee_services_employee ON public.employee_services(employee_id);
CREATE INDEX idx_employee_services_service ON public.employee_services(service_id);

-- Enable RLS
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view employee services from their tenant
CREATE POLICY "Users can view tenant employee services"
  ON public.employee_services FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_services.employee_id 
    AND e.tenant_id = get_user_tenant_id(auth.uid())
  ));

-- Policy: Admins can manage employee services from their tenant
CREATE POLICY "Admins can manage tenant employee services"
  ON public.employee_services FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_services.employee_id 
    AND e.tenant_id = get_user_tenant_id(auth.uid())
  ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Policy: Super admins can manage all employee services
CREATE POLICY "Super admins can manage all employee services"
  ON public.employee_services FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));