
-- 1. Create enum types
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'employee', 'user');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded');
CREATE TYPE public.tenant_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.financial_type AS ENUM ('income', 'expense');

-- 2. Create tenants (companies) table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  cnpj TEXT,
  logo_url TEXT,
  max_employees INTEGER DEFAULT 10,
  status tenant_status DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

-- 5. Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  birth_date DATE,
  address TEXT,
  notes TEXT,
  total_visits INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'employee',
  commission_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  specialties TEXT[],
  working_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 30,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status appointment_status DEFAULT 'scheduled',
  payment_status payment_status DEFAULT 'pending',
  price DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Create financial_entries table
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  type financial_type NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 11. Create function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id
$$;

-- 12. Create function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND tenant_id = _tenant_id
  )
$$;

-- 13. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 14. Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15. Add triggers for updated_at
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_financial_entries_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 16. Add trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- 18. RLS Policies for tenants
CREATE POLICY "Super admins can manage all tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

-- 19. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view tenant profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- 20. RLS Policies for user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 21. RLS Policies for clients
CREATE POLICY "Users can view tenant clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can delete tenant clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 22. RLS Policies for employees
CREATE POLICY "Users can view tenant employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage tenant employees"
  ON public.employees FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all employees"
  ON public.employees FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 23. RLS Policies for services
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage tenant services"
  ON public.services FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all services"
  ON public.services FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 24. RLS Policies for appointments
CREATE POLICY "Users can view tenant appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create tenant appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can delete tenant appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 25. RLS Policies for financial_entries
CREATE POLICY "Users can view tenant financial entries"
  ON public.financial_entries FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage tenant financial entries"
  ON public.financial_entries FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all financial entries"
  ON public.financial_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 26. Create indexes for performance
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX idx_services_tenant_id ON public.services(tenant_id);
CREATE INDEX idx_appointments_tenant_id ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_employee_id ON public.appointments(employee_id);
CREATE INDEX idx_financial_entries_tenant_id ON public.financial_entries(tenant_id);
CREATE INDEX idx_financial_entries_date ON public.financial_entries(date);
CREATE INDEX idx_financial_entries_appointment_id ON public.financial_entries(appointment_id);
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
EXECUTE FUNCTION public.handle_updated_at();-- Create employee_services junction table (N:N relationship)
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
  USING (has_role(auth.uid(), 'super_admin'::app_role));-- Add max_whatsapp_instances column to tenants
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
);-- Drop existing policy that includes manager
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
);-- Adicionar política para admins do tenant poderem atualizar configurações
CREATE POLICY "Admins can update their own tenant" 
ON public.tenants 
FOR UPDATE 
USING (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));-- Tabela para registro de endpoints do sistema
CREATE TABLE public.system_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  url_path text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  type text NOT NULL DEFAULT 'edge_function',
  category text,
  expected_params jsonb,
  response_example jsonb,
  is_active boolean DEFAULT true,
  requires_auth boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: Apenas Super Admins podem visualizar
ALTER TABLE public.system_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view endpoints"
ON public.system_endpoints FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_system_endpoints_updated_at
BEFORE UPDATE ON public.system_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Seed: Inserir todos os endpoints existentes
INSERT INTO public.system_endpoints (name, display_name, description, url_path, method, type, category, expected_params, response_example, requires_auth) VALUES
('services', 'Listar Serviços', 'Retorna lista de serviços ativos do tenant', '/functions/v1/services', 'GET', 'edge_function', 'Agendamento', '{"tenantId": "uuid (obrigatório)", "active": "boolean (opcional)", "category": "string (opcional)", "q": "string (opcional)"}', '{"tenantId": "uuid", "services": [{"id": "uuid", "name": "string", "durationMin": "number", "price": "number", "category": "string", "isActive": "boolean"}]}', false),

('create-appointment', 'Criar Agendamento', 'Cria um novo agendamento no sistema', '/functions/v1/create-appointment', 'POST', 'edge_function', 'Agendamento', '{"tenantId": "uuid", "clientName": "string", "clientPhone": "string", "serviceId": "uuid", "employeeId": "uuid", "scheduledAt": "ISO datetime", "notes": "string (opcional)"}', '{"success": true, "appointment": {"id": "uuid", "status": "scheduled"}}', false),

('available-professionals', 'Profissionais Disponíveis', 'Retorna profissionais disponíveis para um serviço em determinada data/hora', '/functions/v1/available-professionals', 'GET', 'edge_function', 'Agendamento', '{"tenantId": "uuid", "serviceId": "uuid", "date": "YYYY-MM-DD", "time": "HH:mm"}', '{"professionals": [{"id": "uuid", "name": "string", "available": true}]}', false),

('client-lookup', 'Buscar Cliente', 'Busca informações completas do cliente por telefone', '/functions/v1/client-lookup', 'POST', 'edge_function', 'Clientes', '{"phone": "string (telefone normalizado)"}', '{"client": {"id": "uuid", "name": "string", "phone": "string"}, "establishment": {"name": "string", "services": [], "employees": []}}', false),

('client-identify', 'Identificar Cliente', 'Identifica se um contato é cliente ativo do tenant', '/functions/v1/client-identify', 'GET', 'edge_function', 'Clientes', '{"phone": "string", "tenantId": "uuid"}', '{"isClient": true, "clientId": "uuid", "appointmentCount": "number"}', false),

('establishment-info', 'Informações do Estabelecimento', 'Retorna informações públicas do estabelecimento', '/functions/v1/establishment-info', 'GET', 'edge_function', 'Tenant', '{"tenantId": "uuid"}', '{"name": "string", "address": "string", "phone": "string", "workingHours": {}}', false),

('evolution-api', 'Evolution API Proxy', 'Proxy para comunicação com Evolution API (WhatsApp)', '/functions/v1/evolution-api', 'POST', 'edge_function', 'WhatsApp', '{"action": "string", "instanceName": "string", "payload": {}}', '{"success": true, "data": {}}', true),

('lead-broadcast', 'Disparo de Mensagens', 'Envia mensagens em massa para leads selecionados', '/functions/v1/lead-broadcast', 'POST', 'edge_function', 'Leads', '{"leadIds": ["uuid"], "message": "string"}', '{"sent": 10, "failed": 0, "results": []}', true),

('create-user', 'Criar Usuário', 'Cria novo usuário no sistema com perfil e roles', '/functions/v1/create-user', 'POST', 'edge_function', 'Usuários', '{"email": "string", "password": "string", "fullName": "string", "tenantId": "uuid", "role": "app_role"}', '{"success": true, "userId": "uuid"}', true),

('delete-user', 'Excluir Usuário', 'Remove usuário e todos os dados relacionados', '/functions/v1/delete-user', 'DELETE', 'edge_function', 'Usuários', '{"userId": "uuid"}', '{"success": true}', true),

('audit-orphan-users', 'Auditoria de Usuários', 'Identifica usuários órfãos sem perfil ou tenant', '/functions/v1/audit-orphan-users', 'GET', 'edge_function', 'Administração', '{}', '{"orphanUsers": [{"id": "uuid", "email": "string", "issues": []}], "summary": {"total": 0}}', true);-- Table to store WhatsApp instance data (UaZapi tokens)
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
-- Tabela de configurações globais do sistema (key-value)
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: apenas super_admin pode ler/escrever
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Seed: webhook URL padrão vazio
INSERT INTO public.system_settings (key, value)
VALUES ('whatsapp_webhook_url', '');
-- Add is_lead boolean column (false = client, true = lead)
-- Existing clients default to false (they are real clients)
ALTER TABLE public.clients
  ADD COLUMN is_lead BOOLEAN NOT NULL DEFAULT false;

-- Make name nullable (n8n may not have the contact name)
ALTER TABLE public.clients ALTER COLUMN name DROP NOT NULL;

-- Create index for efficient filtering by tenant and is_lead
CREATE INDEX idx_clients_tenant_is_lead ON public.clients(tenant_id, is_lead);
ALTER TABLE public.tenants
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
-- Sistema de Notificações
-- Permite que super_admins enviem notificações para tenants
-- Apenas admins e managers dos tenants podem ver as notificações

-- 1. Tabela de notificações do sistema (criadas pelo super_admin)
CREATE TABLE public.system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de tenants alvo (quando target_type = 'specific')
CREATE TABLE public.system_notification_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, tenant_id)
);

-- 3. Tabela de recibos por usuário (status de leitura/exclusão)
CREATE TABLE public.user_notification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- 4. Função auxiliar para verificar se usuário é admin ou manager
CREATE OR REPLACE FUNCTION public.user_is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- 5. Habilitar RLS em todas as tabelas
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notification_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_receipts ENABLE ROW LEVEL SECURITY;

-- 6. Policies para system_notifications

-- Super admins podem fazer tudo
CREATE POLICY "Super admins can manage all system notifications"
  ON public.system_notifications
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins e managers podem ver notificações ativas e não expiradas direcionadas ao seu tenant
CREATE POLICY "Admins and managers can view targeted notifications"
  ON public.system_notifications
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND public.user_is_admin_or_manager(auth.uid())
    AND (
      target_type = 'all'
      OR EXISTS (
        SELECT 1 FROM public.system_notification_targets snt
        WHERE snt.notification_id = id
        AND snt.tenant_id = public.get_user_tenant_id(auth.uid())
      )
    )
  );

-- 7. Policies para system_notification_targets

-- Super admins podem gerenciar todos os targets
CREATE POLICY "Super admins can manage notification targets"
  ON public.system_notification_targets
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins e managers podem ver targets do seu tenant
CREATE POLICY "Admins and managers can view their tenant targets"
  ON public.system_notification_targets
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.user_is_admin_or_manager(auth.uid())
  );

-- 8. Policies para user_notification_receipts

-- Usuários podem gerenciar seus próprios recibos
CREATE POLICY "Users can manage their own notification receipts"
  ON public.user_notification_receipts
  FOR ALL
  USING (user_id = auth.uid());

-- Super admins podem ver todos os recibos
CREATE POLICY "Super admins can view all notification receipts"
  ON public.user_notification_receipts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 9. Triggers para updated_at
CREATE TRIGGER set_system_notifications_updated_at
  BEFORE UPDATE ON public.system_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 10. Índices para performance
CREATE INDEX idx_system_notifications_is_active ON public.system_notifications(is_active);
CREATE INDEX idx_system_notifications_expires_at ON public.system_notifications(expires_at);
CREATE INDEX idx_system_notifications_created_at ON public.system_notifications(created_at DESC);
CREATE INDEX idx_system_notification_targets_notification ON public.system_notification_targets(notification_id);
CREATE INDEX idx_system_notification_targets_tenant ON public.system_notification_targets(tenant_id);
CREATE INDEX idx_user_notification_receipts_user ON public.user_notification_receipts(user_id);
CREATE INDEX idx_user_notification_receipts_notification ON public.user_notification_receipts(notification_id);
CREATE INDEX idx_user_notification_receipts_read ON public.user_notification_receipts(read_at);
-- Migration: Add monthly_fee column to tenants table
-- Description: Adds subscription pricing field for SaaS billing tracking

-- Add monthly_fee column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0;

-- Add subscription_started_at to track when subscription began
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;

-- Update existing tenants to have subscription_started_at = created_at
UPDATE public.tenants
SET subscription_started_at = created_at
WHERE subscription_started_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.monthly_fee IS 'Monthly subscription fee in BRL charged by the platform';
COMMENT ON COLUMN public.tenants.subscription_started_at IS 'Date when tenant started paying subscription';
-- Migration: Create MRR tracking tables
-- Description: Creates tables for tracking MRR snapshots and tenant status history for churn calculation

-- ============================================
-- Table: mrr_snapshots
-- Stores monthly MRR snapshots for historical tracking and charts
-- ============================================
CREATE TABLE IF NOT EXISTS public.mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  active_tenants INTEGER NOT NULL DEFAULT 0,
  new_tenants INTEGER NOT NULL DEFAULT 0,
  churned_tenants INTEGER NOT NULL DEFAULT 0,
  mrr_from_new DECIMAL(12,2) NOT NULL DEFAULT 0,
  mrr_churned DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT mrr_snapshots_snapshot_date_unique UNIQUE (snapshot_date)
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date ON public.mrr_snapshots(snapshot_date DESC);

-- ============================================
-- Table: tenant_status_history
-- Tracks tenant status changes for churn calculation
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenant_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  old_status public.tenant_status,
  new_status public.tenant_status NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tenant_status_history_tenant ON public.tenant_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_status_history_changed_at ON public.tenant_status_history(changed_at DESC);

-- ============================================
-- Trigger Function: Log tenant status changes
-- ============================================
CREATE OR REPLACE FUNCTION public.log_tenant_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.tenant_status_history (tenant_id, old_status, new_status, changed_by)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tenants table
DROP TRIGGER IF EXISTS on_tenant_status_change ON public.tenants;
CREATE TRIGGER on_tenant_status_change
  AFTER INSERT OR UPDATE OF status ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.log_tenant_status_change();

-- ============================================
-- Database Function: Generate MRR Snapshot
-- Can be called manually or via scheduled job
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_mrr_snapshot(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_mrr DECIMAL(12,2);
  v_active_tenants INTEGER;
  v_new_tenants INTEGER;
  v_churned_tenants INTEGER;
  v_mrr_from_new DECIMAL(12,2);
  v_mrr_churned DECIMAL(12,2);
  v_month_start DATE;
BEGIN
  v_month_start := DATE_TRUNC('month', target_date);

  -- Total MRR from active tenants
  SELECT COALESCE(SUM(monthly_fee), 0), COUNT(*)
  INTO v_total_mrr, v_active_tenants
  FROM public.tenants
  WHERE status = 'active';

  -- New tenants this month (created this month and active)
  SELECT COUNT(*), COALESCE(SUM(monthly_fee), 0)
  INTO v_new_tenants, v_mrr_from_new
  FROM public.tenants
  WHERE status = 'active'
    AND created_at >= v_month_start
    AND created_at < v_month_start + INTERVAL '1 month';

  -- Churned tenants this month (became inactive/suspended this month)
  SELECT COUNT(*), COALESCE(SUM(t.monthly_fee), 0)
  INTO v_churned_tenants, v_mrr_churned
  FROM public.tenant_status_history h
  JOIN public.tenants t ON t.id = h.tenant_id
  WHERE h.old_status = 'active'
    AND h.new_status IN ('inactive', 'suspended')
    AND h.changed_at >= v_month_start
    AND h.changed_at < v_month_start + INTERVAL '1 month';

  -- Insert or update snapshot
  INSERT INTO public.mrr_snapshots (
    snapshot_date, total_mrr, active_tenants, new_tenants,
    churned_tenants, mrr_from_new, mrr_churned
  )
  VALUES (
    v_month_start, v_total_mrr, v_active_tenants, v_new_tenants,
    v_churned_tenants, v_mrr_from_new, v_mrr_churned
  )
  ON CONFLICT (snapshot_date)
  DO UPDATE SET
    total_mrr = EXCLUDED.total_mrr,
    active_tenants = EXCLUDED.active_tenants,
    new_tenants = EXCLUDED.new_tenants,
    churned_tenants = EXCLUDED.churned_tenants,
    mrr_from_new = EXCLUDED.mrr_from_new,
    mrr_churned = EXCLUDED.mrr_churned;
END;
$$;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_status_history ENABLE ROW LEVEL SECURITY;

-- Super admins can manage mrr_snapshots
CREATE POLICY "Super admins can view mrr_snapshots"
  ON public.mrr_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert mrr_snapshots"
  ON public.mrr_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update mrr_snapshots"
  ON public.mrr_snapshots FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can manage tenant_status_history
CREATE POLICY "Super admins can view tenant_status_history"
  ON public.tenant_status_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert tenant_status_history"
  ON public.tenant_status_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================
-- Generate initial snapshot for current month
-- ============================================
SELECT public.generate_mrr_snapshot(CURRENT_DATE);
