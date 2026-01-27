# functions/ - Supabase Edge Functions

Edge Functions executadas em Deno runtime para lógica de backend.

---

## Estrutura

```
functions/
│
├── # API PÚBLICA (integração n8n - autenticação via x-agent-key)
├── availability-summary/      # Resumo de disponibilidade (range de datas)
├── available-professionals/   # Listar profissionais disponíveis
├── cancel-appointment/        # Cancelar agendamento
├── client-appointments/       # Buscar cliente + agendamentos (cria lead se não existir)
├── create-appointment/        # Criar agendamento
├── establishment-info/        # Info da empresa + serviços
├── reschedule-appointment/    # Remarcar agendamento
│
├── # LEMBRETES (integração n8n - autenticação via x-agent-key de sistema)
├── pending-reminders/         # Listar lembretes pendentes de envio
├── mark-reminder-sent/        # Marcar lembrete como enviado
│
├── # FUNÇÕES INTERNAS (requerem JWT do Supabase)
├── create-user/               # Criar usuário (admin)
├── delete-user/               # Deletar usuário (admin)
└── whatsapp-api/              # Enviar mensagem WhatsApp
```

---

## Funções por Categoria

### API Pública (Integração n8n)

Endpoints expostos para automação. Autenticação via header `x-agent-key`.

| Função | Método | Parâmetros | Descrição |
|--------|--------|------------|-----------|
| `client-appointments` | GET | `tenantId`, `phone`, `name` (opcional) | Busca cliente e agendamentos futuros (cria lead se não existir) |
| `create-appointment` | POST | body JSON | Criar novo agendamento |
| `cancel-appointment` | POST | `tenantId`, `appointmentId`, `reason` (opcional) | Cancelar agendamento existente |
| `reschedule-appointment` | POST | `tenantId`, `appointmentId`, `dateTime`, `employeeId` (opcional) | Remarcar agendamento e/ou trocar profissional |
| `establishment-info` | GET | `tenantId`, `active`, `category`, `q` | Info da empresa + lista de serviços |
| `available-professionals` | GET | `dateTime`, `tenantId`, `serviceId` (opcional) | Retorna profissionais disponíveis a partir de uma data/hora |
| `availability-summary` | GET | `tenantId`, `startDate`, `endDate`, `serviceId`, `professionalId`, `limit` | Resumo de disponibilidade para range de datas |

### Lembretes (Integração n8n)

Endpoints para sistema de lembretes automáticos. Autenticação via header `x-agent-key` (apenas chaves de sistema).

| Função | Método | Parâmetros | Descrição |
|--------|--------|------------|-----------|
| `pending-reminders` | POST | - | Listar agendamentos pendentes de lembrete |
| `mark-reminder-sent` | POST | `appointment_id` | Marcar lembrete como enviado |

### Funções Internas (Admin)

Endpoints protegidos que requerem JWT do Supabase. Não expostos para integrações externas.

| Função | Método | Parâmetros | Descrição |
|--------|--------|------------|-----------|
| `create-user` | POST | body JSON | Criar usuário no Supabase Auth |
| `delete-user` | DELETE | `userId` | Deletar usuário |
| `whatsapp-api` | POST | body JSON | Enviar mensagem WhatsApp via Evolution API |

---

## Detalhes das Funções

### available-professionals

**Endpoint:** `GET /functions/v1/available-professionals`

**Query Params:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `dateTime` (ISO 8601, obrigatório) - Data/hora de referência (ex: `2026-01-26T13:38:14.085-03:00`)
- `serviceId` (UUID, opcional) - Filtrar por profissionais que realizam o serviço

**Comportamento:**
- Extrai a data e hora do parâmetro `dateTime` no timezone de São Paulo (UTC-3)
- Retorna apenas slots disponíveis **a partir** do horário informado
- Se `serviceId` for informado, filtra profissionais que realizam o serviço e considera a duração do serviço

**Response:**
```json
{
  "date": "2026-01-26",
  "requestedTime": "13:38",
  "available": [
    {
      "professionalId": "uuid",
      "name": "Ana Costa",
      "workingHours": { "start": "08:00", "end": "18:00" },
      "availableRanges": [
        { "start": "13:38", "end": "14:30" },
        { "start": "15:30", "end": "18:00" }
      ],
      "occupiedRanges": [
        { "start": "14:30", "end": "15:30" }
      ]
    }
  ]
}
```

**Nota:** O `requestedTime` na resposta indica o horário a partir do qual os slots são filtrados.

---

### availability-summary

**Endpoint:** `GET /functions/v1/availability-summary`

**Headers:**
- `x-agent-key` (string, obrigatório) - Chave de API do agente

**Query Params:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `startDate` (ISO 8601 ou YYYY-MM-DD, obrigatório) - Data inicial (ex: `2026-01-27` ou `2026-01-27T10:00:00-03:00`)
- `endDate` (ISO 8601 ou YYYY-MM-DD, opcional) - Data final (default: startDate, max: startDate + 14 dias)
- `serviceId` (UUID, opcional) - Filtrar por serviço (considera duração)
- `professionalId` (UUID, opcional) - Filtrar por profissional
- `limit` (number, opcional) - Máximo de slots por profissional/dia (default: 5)

**Comportamento:**
- Retorna **resumo** de disponibilidade para um range de datas
- Diferente de `available-professionals`, não exige horário específico
- Inclui `nextAvailableSlot` para respostas rápidas da IA
- Otimizado para consultas como "tem vaga amanhã?" ou "que horários têm essa semana?"

**Response:**
```json
{
  "success": true,
  "query": {
    "startDate": "2026-01-27",
    "endDate": "2026-01-31",
    "serviceId": "uuid",
    "serviceName": "Escova Progressiva",
    "serviceDuration": 90
  },
  "summary": {
    "totalDays": 5,
    "daysWithAvailability": 3,
    "nextAvailableSlot": {
      "date": "2026-01-27",
      "time": "09:00",
      "professional": "Ana Costa"
    }
  },
  "availability": [
    {
      "date": "2026-01-27",
      "dayOfWeek": "segunda",
      "hasAvailability": true,
      "professionals": [
        {
          "id": "uuid",
          "name": "Ana Costa",
          "slots": [
            { "start": "09:00", "end": "12:00" },
            { "start": "14:00", "end": "18:00" }
          ]
        }
      ]
    }
  ]
}
```

**Nota:** Use `available-professionals` para **validar** um horário específico antes de criar agendamento. Use `availability-summary` para **descobrir** opções disponíveis.

---

### create-appointment

**Endpoint:** `POST /functions/v1/create-appointment`

**Headers:**
- `x-agent-key` (string, obrigatório) - Chave de API do agente

**Body:**
```json
{
  "tenantId": "uuid",
  "clientPhone": "5585997667750",
  "clientName": "Maria Silva (opcional)",
  "serviceId": "uuid",
  "professionalId": "uuid",
  "dateTime": "2026-01-27T14:00:00-03:00",
  "notes": "Observações (opcional)"
}
```

**Parâmetros:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `clientPhone` (string, obrigatório) - Telefone do cliente (será normalizado)
- `clientName` (string, opcional) - Nome do cliente
- `serviceId` (UUID, obrigatório) - ID do serviço
- `professionalId` (UUID, obrigatório) - ID do profissional
- `dateTime` (ISO 8601, obrigatório) - Data/hora do agendamento (ex: `2026-01-27T14:00:00-03:00`)
- `notes` (string, opcional) - Observações

**Validações realizadas:**
1. Tenant ativo
2. Serviço ativo e pertence ao tenant
3. Profissional ativo e pertence ao tenant
4. Profissional realiza o serviço (employee_services)
5. Empresa funciona no dia solicitado (workingDays)
6. Horário dentro do expediente da empresa
7. Profissional trabalha no dia solicitado
8. Horário dentro do expediente do profissional
9. Não conflita com intervalos (breaks) do profissional
10. Não conflita com outros agendamentos
11. Serviço cabe dentro do expediente (considerando duração)

**Response (sucesso):**
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "date": "2026-01-27",
    "time": "14:00",
    "endTime": "15:00",
    "duration": 60,
    "status": "scheduled",
    "service": {
      "id": "uuid",
      "name": "Escova Progressiva",
      "price": 150
    },
    "professional": {
      "id": "uuid",
      "name": "Ana Costa"
    },
    "client": {
      "id": "uuid",
      "phone": "+5585997667750",
      "name": "Maria Silva",
      "isNew": false
    }
  },
  "message": "Appointment scheduled successfully for 2026-01-27 at 14:00 with Ana Costa"
}
```

**Exemplos de erro:**
- `Empresa não funciona neste dia (Domingo)`
- `Horário 08:00 é antes da abertura da empresa (09:00)`
- `Agendamento terminaria após fechamento da empresa (19:00). Duração do serviço: 90 minutos`
- `Profissional "Ana" não trabalha neste dia`
- `Horário conflita com intervalo do profissional (12:00 - 13:00: Almoço)`
- `Time slot conflicts with existing appointment (14:00 - 15:00)`
- `Professional "João" is not qualified to perform service "Corte Feminino"`

---

### cancel-appointment

**Endpoint:** `POST /functions/v1/cancel-appointment`

**Body:**
```json
{
  "tenantId": "uuid",
  "appointmentId": "uuid",
  "reason": "Motivo do cancelamento (opcional)"
}
```

**Parâmetros:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `appointmentId` (UUID, obrigatório) - ID do agendamento
- `reason` (string, opcional) - Motivo do cancelamento (registrado nas notas)

**Validações:**
- Agendamento não pode ter status `completed`, `cancelled` ou `no_show`

**Response:**
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "scheduledAt": "2026-01-26T14:00:00-03:00",
    "date": "2026-01-26",
    "time": "14:00",
    "status": "cancelled",
    "previousStatus": "scheduled",
    "reason": "Cliente solicitou cancelamento",
    "cancelledAt": "2026-01-26T10:00:00.000Z",
    "professional": { "id": "uuid", "name": "Ana Costa" },
    "client": { "id": "uuid", "name": "Maria Silva", "phone": "5585997667750" },
    "service": { "id": "uuid", "name": "Corte Feminino", "duration": 60, "price": 150 }
  },
  "message": "Agendamento cancelado com sucesso"
}
```

---

### reschedule-appointment

**Endpoint:** `POST /functions/v1/reschedule-appointment`

**Body:**
```json
{
  "tenantId": "uuid",
  "appointmentId": "uuid",
  "dateTime": "2026-01-26T13:38:14.085-03:00",
  "employeeId": "uuid (opcional)",
  "notes": "Observações (opcional)"
}
```

**Parâmetros:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `appointmentId` (UUID, obrigatório) - ID do agendamento
- `dateTime` (ISO 8601, obrigatório) - Nova data/hora (ex: `2026-01-26T13:38:14.085-03:00`)
- `employeeId` (UUID, opcional) - Novo profissional (para trocar o responsável)
- `notes` (string, opcional) - Atualizar observações

**Validações realizadas:**
1. Agendamento não pode ter status `completed`, `cancelled` ou `no_show`
2. Tenant deve estar ativo
3. Profissional (atual ou novo) deve estar ativo
4. Se trocar profissional, verifica se ele realiza o serviço (employee_services)
5. Empresa deve funcionar no dia solicitado (workingDays)
6. Horário deve estar dentro do expediente da empresa
7. Profissional deve trabalhar no dia solicitado
8. Horário deve estar dentro do expediente do profissional
9. Não pode conflitar com intervalos (breaks) do profissional
10. Não pode conflitar com outros agendamentos do profissional

**Response (sucesso):**
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "previousScheduledAt": "2026-01-25T14:00:00-03:00",
    "newScheduledAt": "2026-01-26T13:38:00-03:00",
    "date": "2026-01-26",
    "time": "13:38",
    "endTime": "14:38",
    "duration": 60,
    "status": "scheduled",
    "professionalChanged": false,
    "previousProfessionalId": null,
    "professional": { "id": "uuid", "name": "Ana Costa" },
    "client": { "id": "uuid", "name": "Maria Silva", "phone": "5585997667750" },
    "service": { "id": "uuid", "name": "Corte Feminino", "duration": 60, "price": 150 }
  },
  "message": "Agendamento reagendado com sucesso para 2026-01-26 às 13:38"
}
```

**Response (troca de profissional):**
```json
{
  "success": true,
  "appointment": {
    "professionalChanged": true,
    "previousProfessionalId": "uuid-anterior",
    "professional": { "id": "uuid-novo", "name": "João Silva" }
  },
  "message": "Agendamento reagendado com sucesso para 2026-01-26 às 13:38 com João Silva"
}
```

**Exemplos de erro:**
- `Empresa não funciona neste dia (Domingo)`
- `Horário 08:00 é antes da abertura da empresa (09:00)`
- `Profissional "Ana" não trabalha neste dia (Domingo)`
- `Horário conflita com intervalo do profissional (12:00 - 13:00: Almoço)`
- `Time slot conflicts with existing appointment (14:00 - 15:00)`
- `Professional "João" is not qualified to perform service "Corte Feminino"`

---

### client-appointments

**Endpoint:** `GET /functions/v1/client-appointments`

**Headers:**
- `x-agent-key` (string, obrigatório) - Chave de API do agente

**Query Params:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `phone` (string, obrigatório) - Telefone do cliente
- `name` (string, opcional) - Nome do cliente (usado apenas na criação automática)

**Comportamento:**
1. Busca cliente pelo telefone normalizado
2. Se não encontrado, cria automaticamente como lead
3. Retorna agendamentos futuros (>= início do dia atual às 00:00 UTC-3)

**Normalização de Telefone:**
- Adiciona DDI `55` se necessário (números de 10 ou 11 dígitos)
- Salva exatamente como recebido (não manipula o 9º dígito)

**Response (cliente existente):**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "uuid",
      "name": "Maria Silva",
      "phone": "5585997667750",
      "email": "maria@email.com",
      "cpf": "123.456.789-00",
      "birthDate": "1990-05-15",
      "address": "Rua Example, 123",
      "notes": "Cliente VIP",
      "isLead": false,
      "totalVisits": 5,
      "lastVisit": "2024-01-10T14:00:00-03:00"
    },
    "isNewClient": false,
    "appointments": [
      {
        "id": "uuid",
        "date": "2024-01-26",
        "time": "14:30",
        "endTime": "15:30",
        "scheduledAt": "2024-01-26T17:30:00.000Z",
        "duration": 60,
        "status": "scheduled",
        "paymentStatus": "pending",
        "price": 150.00,
        "notes": null,
        "professional": { "id": "uuid", "name": "Ana Costa" },
        "service": { "id": "uuid", "name": "Corte Feminino", "duration": 60, "price": 150.00 }
      }
    ],
    "appointmentCount": 1
  },
  "message": "Cliente encontrado com 1 agendamento(s) futuro(s)"
}
```

**Response (novo cliente criado):**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "uuid",
      "name": "João Silva",
      "phone": "5585997667750",
      "isLead": true,
      "totalVisits": 0
    },
    "isNewClient": true,
    "appointments": [],
    "appointmentCount": 0
  },
  "message": "Novo cliente criado automaticamente"
}
```

**Nota:** Se o parâmetro `name` não for enviado ou estiver vazio, o telefone será usado como nome do cliente criado

---

### establishment-info

**Endpoint:** `GET /functions/v1/establishment-info`

**Query Params:**
- `tenantId` (UUID, obrigatório) - ID do tenant
- `active` (boolean, opcional) - Filtrar serviços ativos (default: true)
- `category` (string, opcional) - Filtrar serviços por categoria
- `q` (string, opcional) - Buscar serviço por nome

**Response:**
```json
{
  "tenantId": "uuid",
  "name": "Salão Beleza",
  "address": "Rua Example, 123",
  "phone": "+5585999887766",
  "email": "contato@salao.com",
  "timezone": "America/Sao_Paulo",
  "earliestOpen": "08:00",
  "latestClose": "20:00",
  "workingHours": {
    "monday": { "open": "08:00", "close": "18:00", "isOpen": true },
    "tuesday": { "open": "08:00", "close": "18:00", "isOpen": true },
    "sunday": { "open": null, "close": null, "isOpen": false }
  },
  "policies": {
    "cancellation": "Cancelamento permitido até 2h antes",
    "late": null
  },
  "services": [
    {
      "id": "uuid",
      "name": "Corte Feminino",
      "durationMin": 60,
      "price": 150.00,
      "category": "Cabelo",
      "isActive": true
    }
  ]
}
```

**Nota:** Este endpoint unifica informações do estabelecimento e lista de serviços. Todos os parâmetros de filtro (active, category, q) se aplicam apenas aos serviços retornados.

---

### pending-reminders

**Endpoint:** `POST /functions/v1/pending-reminders`

**Headers:**
- `x-agent-key` (string, obrigatório) - Chave de API de **sistema** (tenant_id = null)

**Descrição:**
Retorna todos os agendamentos que precisam de lembrete, considerando as configurações de cada tenant.

**Lógica:**
1. Busca tenants ativos com `notifyOnReminder = true`
2. Para cada tenant, calcula janela de tempo: NOW até NOW + `reminderHours`
3. Retorna agendamentos com status `scheduled` ou `confirmed` onde `reminder_sent_at IS NULL`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "reminders": [
    {
      "appointment_id": "uuid",
      "tenant_id": "uuid",
      "tenant_name": "Salão Beleza",
      "client_name": "Maria Silva",
      "client_phone": "5511999887766",
      "service_name": "Corte Feminino",
      "employee_name": "Ana Costa",
      "scheduled_at": "2026-01-28T14:00:00-03:00",
      "formatted_date": "28/01/2026",
      "formatted_time": "14:00",
      "whatsapp_token": "token_uazapi_do_tenant"
    }
  ]
}
```

**Notas:**
- `whatsapp_token` será `null` se o tenant não tiver instância WhatsApp conectada
- Apenas chaves de sistema podem acessar (acesso a todos os tenants)

---

### mark-reminder-sent

**Endpoint:** `POST /functions/v1/mark-reminder-sent`

**Headers:**
- `x-agent-key` (string, obrigatório) - Chave de API de **sistema** (tenant_id = null)

**Body:**
```json
{
  "appointment_id": "uuid"
}
```

**Descrição:**
Marca um agendamento como tendo o lembrete enviado. Atualiza o campo `reminder_sent_at` com o timestamp atual.

**Response (sucesso):**
```json
{
  "success": true,
  "appointment_id": "uuid",
  "reminder_sent_at": "2026-01-28T12:00:00.000Z"
}
```

**Response (já marcado):**
```json
{
  "success": true,
  "message": "Reminder was already marked as sent",
  "appointment_id": "uuid",
  "reminder_sent_at": "2026-01-28T10:00:00.000Z"
}
```

**Fluxo n8n recomendado:**
```
1. Schedule Trigger (*/15 * * * *)
2. HTTP Request → pending-reminders
3. IF count > 0
4. Split In Batches
5. HTTP Request → UaZapi (enviar mensagem WhatsApp)
6. HTTP Request → mark-reminder-sent
```

---

### create-user

**Endpoint:** `POST /functions/v1/create-user`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123",
  "tenantId": "uuid",
  "role": "employee"
}
```

---

### delete-user

**Endpoint:** `DELETE /functions/v1/delete-user`

**Query Params:**
- `userId` (UUID)

---

### whatsapp-api

**Endpoint:** `POST /functions/v1/whatsapp-api`

**Body:**
```json
{
  "instanceName": "instance-name",
  "phone": "5511999999999",
  "message": "Mensagem"
}
```

---

## Padrão de Implementação

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lógica da função...

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Deploy

```bash
# Deploy uma função específica
supabase functions deploy available-professionals

# Deploy todas as funções
supabase functions deploy

# Ver logs
supabase functions logs available-professionals --tail
```

---

## Configuração

Em `supabase/config.toml`, todas as funções têm:

```toml
[functions.function-name]
verify_jwt = false
```

Isso desabilita verificação JWT do Supabase.

---

## Autenticação

### Endpoints para Agentes (x-agent-key)

**TODOS** os endpoints de agendamento requerem autenticação via header `x-agent-key`:

| Endpoint | Requer x-agent-key |
|----------|-------------------|
| `availability-summary` | Sim |
| `client-appointments` | Sim |
| `establishment-info` | Sim |
| `available-professionals` | Sim |
| `create-appointment` | Sim |
| `reschedule-appointment` | Sim |
| `cancel-appointment` | Sim |

**Como obter uma chave:**
1. Acesse Integrações > Chaves de API no painel admin
2. Clique em "Nova Chave"
3. Copie a chave gerada (mostrada apenas uma vez)

**Tipos de chave:**
- **Chave de sistema** (`tenant_id = NULL`): Acesso a todos os tenants
- **Chave de tenant**: Acesso apenas ao tenant específico

**Validações realizadas:**
1. Chave presente no header `x-agent-key`
2. Chave válida (hash encontrado no banco)
3. Chave ativa (`is_active = true`)
4. Chave não expirada
5. Chave autorizada para o tenant (ou chave de sistema)

**Exemplo de uso:**
```bash
# GET request
curl -X GET "https://xxx.supabase.co/functions/v1/client-appointments?tenantId=UUID&phone=11999887766" \
  -H "x-agent-key: cky_abc123..."

# POST request
curl -X POST "https://xxx.supabase.co/functions/v1/create-appointment" \
  -H "Content-Type: application/json" \
  -H "x-agent-key: cky_abc123..." \
  -d '{"tenantId": "uuid", ...}'
```

**Resposta de erro (401 Unauthorized):**
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Missing x-agent-key header"
}
```

### Endpoints de Lembretes (x-agent-key de sistema)

Endpoints para integração com n8n/automação. Requerem chave de **sistema** (`tenant_id = NULL`):

| Endpoint | Requer x-agent-key (sistema) |
|----------|------------------------------|
| `pending-reminders` | Sim |
| `mark-reminder-sent` | Sim |

### Endpoints Administrativos (Authorization)

Endpoints de gestão de usuários requerem token JWT no header `Authorization`:

| Endpoint | Requer Authorization |
|----------|---------------------|
| `create-user` | Sim |
| `delete-user` | Sim |
| `whatsapp-api` | Sim |

---

## Timezone

Todas as funções operam em **UTC-3 (São Paulo)**. Datas/horas devem incluir offset:

```typescript
// Correto
const date = "2024-01-15T09:00:00-03:00"

// Incorreto (ambíguo)
const date = "2024-01-15T09:00:00"
```
