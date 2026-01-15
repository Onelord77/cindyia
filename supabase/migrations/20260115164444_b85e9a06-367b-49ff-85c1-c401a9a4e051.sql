-- Drop existing policy that includes manager
DROP POLICY IF EXISTS "Admins can manage tenant employees" ON public.employees;

-- Create separate policies for different operations

-- Admins and super_admins can INSERT employees
CREATE POLICY "Admins can insert tenant employees"
ON public.employees
FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins and super_admins can UPDATE employees
CREATE POLICY "Admins can update tenant employees"
ON public.employees
FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins and super_admins can DELETE employees
CREATE POLICY "Admins can delete tenant employees"
ON public.employees
FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Also update employee_services to match (remove manager)
DROP POLICY IF EXISTS "Admins can manage tenant employee services" ON public.employee_services;

CREATE POLICY "Admins can manage tenant employee services"
ON public.employee_services
FOR ALL
USING (
  (EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_services.employee_id 
    AND e.tenant_id = get_user_tenant_id(auth.uid())
  )) 
  AND has_role(auth.uid(), 'admin'::app_role)
);