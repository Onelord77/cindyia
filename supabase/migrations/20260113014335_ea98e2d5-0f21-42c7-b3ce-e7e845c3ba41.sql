-- Enum para status do lead
CREATE TYPE public.lead_status AS ENUM ('new', 'in_conversation', 'not_scheduled', 'scheduled');

-- Enum para direção da mensagem
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');

-- Tabela de Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  name TEXT,
  first_contact_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status lead_status NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, whatsapp_number)
);

-- Tabela de Tags de Lead
CREATE TABLE public.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Tabela pivot para relacionamento Lead-Tag
CREATE TABLE public.lead_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

-- Tabela de Mensagens de Lead (histórico)
CREATE TABLE public.lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_whatsapp ON public.leads(whatsapp_number);
CREATE INDEX idx_leads_last_message ON public.leads(last_message_at DESC);
CREATE INDEX idx_lead_tags_tenant ON public.lead_tags(tenant_id);
CREATE INDEX idx_lead_messages_lead ON public.lead_messages(lead_id);
CREATE INDEX idx_lead_messages_sent ON public.lead_messages(sent_at DESC);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para leads (super_admin only)
CREATE POLICY "Super admins can manage all leads"
ON public.leads
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies para lead_tags (super_admin only)
CREATE POLICY "Super admins can manage all lead_tags"
ON public.lead_tags
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies para lead_tag_links (super_admin only)
CREATE POLICY "Super admins can manage all lead_tag_links"
ON public.lead_tag_links
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin')
);

-- RLS Policies para lead_messages (super_admin only)
CREATE POLICY "Super admins can manage all lead_messages"
ON public.lead_messages
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Triggers para updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_lead_tags_updated_at
BEFORE UPDATE ON public.lead_tags
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();