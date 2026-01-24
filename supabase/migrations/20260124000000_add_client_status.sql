-- Add is_lead boolean column (false = client, true = lead)
-- Existing clients default to false (they are real clients)
ALTER TABLE public.clients
  ADD COLUMN is_lead BOOLEAN NOT NULL DEFAULT false;

-- Make name nullable (n8n may not have the contact name)
ALTER TABLE public.clients ALTER COLUMN name DROP NOT NULL;

-- Create index for efficient filtering by tenant and is_lead
CREATE INDEX idx_clients_tenant_is_lead ON public.clients(tenant_id, is_lead);
