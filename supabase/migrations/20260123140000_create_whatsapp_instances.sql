-- Table to store WhatsApp instance data (UaZapi tokens)
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  instance_id TEXT,
  instance_token TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  profile_name TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, instance_name)
);

-- RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins can manage all whatsapp instances"
  ON public.whatsapp_instances
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Tenant users can see their own instances
CREATE POLICY "Users can view their tenant whatsapp instances"
  ON public.whatsapp_instances
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Admins can manage their tenant whatsapp instances
CREATE POLICY "Admins can manage their tenant whatsapp instances"
  ON public.whatsapp_instances
  FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER set_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index
CREATE INDEX idx_whatsapp_instances_tenant ON public.whatsapp_instances(tenant_id);
