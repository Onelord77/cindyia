-- Adicionar política para admins do tenant poderem atualizar configurações
CREATE POLICY "Admins can update their own tenant" 
ON public.tenants 
FOR UPDATE 
USING (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));