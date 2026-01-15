-- Add max_whatsapp_instances column to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS max_whatsapp_instances integer DEFAULT 1;

-- Add RLS policies for leads tables to allow admins to access their tenant's data

-- LEADS: Allow admins to view tenant leads
CREATE POLICY "Admins can view tenant leads"
ON public.leads FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- LEADS: Allow admins to manage tenant leads
CREATE POLICY "Admins can manage tenant leads"
ON public.leads FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- LEAD_TAGS: Allow admins to view tenant lead tags
CREATE POLICY "Admins can view tenant lead_tags"
ON public.lead_tags FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- LEAD_TAGS: Allow admins to manage tenant lead tags
CREATE POLICY "Admins can manage tenant lead_tags"
ON public.lead_tags FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- LEAD_TAG_LINKS: Allow admins to view tenant lead tag links (join via leads)
CREATE POLICY "Admins can view tenant lead_tag_links"
ON public.lead_tag_links FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_tag_links.lead_id
    AND l.tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- LEAD_TAG_LINKS: Allow admins to manage tenant lead tag links
CREATE POLICY "Admins can manage tenant lead_tag_links"
ON public.lead_tag_links FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_tag_links.lead_id
    AND l.tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_tag_links.lead_id
    AND l.tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- LEAD_MESSAGES: Allow admins to view tenant lead messages (join via leads)
CREATE POLICY "Admins can view tenant lead_messages"
ON public.lead_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_messages.lead_id
    AND l.tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- LEAD_MESSAGES: Allow admins to manage tenant lead messages
CREATE POLICY "Admins can manage tenant lead_messages"
ON public.lead_messages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_messages.lead_id
    AND l.tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_messages.lead_id
    AND l.tenant_id = get_user_tenant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);