# supabase/ - Backend Supabase

Configuração e código do backend Supabase (PostgreSQL + Edge Functions).

---

## Estrutura

```
supabase/
├── config.toml              # Configuração do projeto Supabase
├── functions/               # Edge Functions (ver functions/README.md)
└── migrations/              # Database migrations
```

---

## config.toml

Configuração principal do Supabase CLI.

```toml
project_id = "thdwtvjbbdclgddjiedz"
```

**Edge Functions JWT Verification:**
Todas as funções têm `verify_jwt = false` para permitir acesso público (autenticação via parâmetros).

---

## functions/

Edge Functions executadas em Deno runtime. Ver [functions/README.md](functions/README.md) para detalhes.

| Função | Propósito |
|--------|-----------|
| `available-professionals` | Listar profissionais disponíveis |
| `cancel-appointment` | Cancelar agendamento |
| `client-appointments` | Listar agendamentos do cliente |
| `create-appointment` | Criar agendamento |
| `create-user` | Criar usuário |
| `delete-user` | Deletar usuário |
| `establishment-info` | Info da empresa |
| `reschedule-appointment` | Remarcar agendamento |
| `services` | Listar serviços |
| `whatsapp-api` | Integração WhatsApp |

---

## migrations/

Database migrations em SQL, aplicadas em ordem cronológica.

| Migration | Descrição |
|-----------|-----------|
| `20260109185622_*.sql` | Schema inicial (tabelas principais) |
| `20260113014335_*.sql` | Atualizações de schema |
| `20260113143220_*.sql` | Atualizações de schema |
| `20260115161704_*.sql` | Atualizações de schema |
| `20260115164444_*.sql` | Atualizações de schema |
| `20260116203655_*.sql` | Atualizações de schema |
| `20260117003519_*.sql` | Atualizações de schema |
| `20260123140000_create_whatsapp_instances.sql` | Tabela de instâncias WhatsApp |
| `20260123160000_create_system_settings.sql` | Configurações de sistema |
| `20260124000000_add_client_status.sql` | Campo status em clientes |
| `20260125000000_add_onboarding_completed.sql` | Flag de onboarding |
| `20260127000000_create_notification_system.sql` | Sistema de notificações |

---

## Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `tenants` | Empresas/salões (multi-tenant) |
| `users` | Usuários do sistema |
| `employees` | Funcionários do tenant |
| `services` | Serviços oferecidos |
| `clients` | Clientes do tenant |
| `appointments` | Agendamentos |
| `financial_entries` | Entradas financeiras |
| `work_schedules` | Horários de trabalho |
| `employee_services` | Relação funcionário-serviço |
| `whatsapp_instances` | Instâncias WhatsApp |
| `system_settings` | Configurações globais |
| `tenant_settings` | Configurações por tenant |
| `system_notifications` | Notificações do sistema (admin) |
| `system_notification_targets` | Tenants alvo das notificações |
| `user_notification_receipts` | Status de leitura por usuário |

---

## Schema Multi-Tenant

Todas as tabelas principais têm coluna `tenant_id` para isolamento de dados:

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  -- ...
);

-- RLS Policy
CREATE POLICY "tenant_isolation" ON appointments
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## Comandos Supabase CLI

```bash
# Login
supabase login

# Link projeto
supabase link --project-ref thdwtvjbbdclgddjiedz

# Gerar types
supabase gen types typescript --project-id thdwtvjbbdclgddjiedz > src/integrations/supabase/types.ts

# Deploy functions
supabase functions deploy <function-name>

# Ver logs
supabase functions logs <function-name>

# Aplicar migrations
supabase db push
```

---

## Variáveis de Ambiente

Frontend (`.env`):
```env
VITE_SUPABASE_URL=https://thdwtvjbbdclgddjiedz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

Edge Functions têm acesso automático a:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
