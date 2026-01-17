-- Tabela para registro de endpoints do sistema
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

('audit-orphan-users', 'Auditoria de Usuários', 'Identifica usuários órfãos sem perfil ou tenant', '/functions/v1/audit-orphan-users', 'GET', 'edge_function', 'Administração', '{}', '{"orphanUsers": [{"id": "uuid", "email": "string", "issues": []}], "summary": {"total": 0}}', true);