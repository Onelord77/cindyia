# pages/ - Páginas da Aplicação

Componentes de página correspondentes às rotas da aplicação.

---

## Estrutura

```
pages/
├── Index.tsx                  # Página inicial (redirect)
├── Login.tsx                  # Autenticação
├── Onboarding.tsx             # Fluxo de onboarding
├── Dashboard.tsx              # Dashboard principal
├── Agenda.tsx                 # Visualização de calendário
├── Agendamentos.tsx           # Gestão de agendamentos
├── Clientes.tsx               # Gestão de clientes
├── Funcionarios.tsx           # Gestão de funcionários
├── Servicos.tsx               # Gestão de serviços
├── Financeiro.tsx             # Módulo financeiro
├── Relatorios.tsx             # Geração de relatórios
├── Configuracoes.tsx          # Configurações do tenant
├── Integracoes.tsx            # Gestão de integrações
├── Notificacoes.tsx           # Central de notificações
├── NotFound.tsx               # Página 404
└── admin/                     # Páginas Super Admin
    ├── Dashboard.tsx          # Dashboard admin
    ├── Empresas.tsx           # Gestão de tenants
    ├── Endpoints.tsx          # Gestão de endpoints
    ├── Notificacoes.tsx       # Gestão de notificações
    └── Configuracoes.tsx      # Configurações globais
```

---

## Mapeamento de Rotas

| Rota | Página | Acesso |
|------|--------|--------|
| `/` | `Dashboard.tsx` | Autenticado |
| `/login` | `Login.tsx` | Público |
| `/onboarding` | `Onboarding.tsx` | Autenticado |
| `/agenda` | `Agenda.tsx` | Autenticado |
| `/agendamentos` | `Agendamentos.tsx` | Autenticado |
| `/clientes` | `Clientes.tsx` | Autenticado |
| `/funcionarios` | `Funcionarios.tsx` | Autenticado |
| `/servicos` | `Servicos.tsx` | Autenticado |
| `/financeiro` | `Financeiro.tsx` | Autenticado |
| `/relatorios` | `Relatorios.tsx` | Autenticado |
| `/configuracoes` | `Configuracoes.tsx` | Autenticado |
| `/integracoes` | `Integracoes.tsx` | Autenticado |
| `/notificacoes` | `Notificacoes.tsx` | admin/manager |
| `/admin` | `admin/Dashboard.tsx` | super_admin |
| `/admin/empresas` | `admin/Empresas.tsx` | super_admin |
| `/admin/endpoints` | `admin/Endpoints.tsx` | super_admin |
| `/admin/notificacoes` | `admin/Notificacoes.tsx` | super_admin |
| `/admin/configuracoes` | `admin/Configuracoes.tsx` | super_admin |
| `*` | `NotFound.tsx` | Público |

---

## Páginas Públicas

### Login.tsx
- Formulário de login com email/senha
- Integração com Supabase Auth
- Redirect após autenticação

### NotFound.tsx
- Página 404
- Link para voltar ao dashboard

---

## Páginas de Tenant

### Dashboard.tsx
- KPIs principais (agendamentos, receita, clientes)
- Gráfico de receita
- Lista de próximos agendamentos
- Serviços mais populares

**Hooks:** `useAppointments`, `useClients`, `useServices`

### Agenda.tsx
- Visualização de calendário
- Agendamentos por dia/semana/mês
- Filtro por funcionário

**Hooks:** `useAppointments`, `useEmployees`

### Agendamentos.tsx
- Tabela de agendamentos
- Criar/editar/cancelar agendamentos
- Filtros por status, data, funcionário

**Hooks:** `useAppointments`, `useClients`, `useServices`, `useEmployees`

### Clientes.tsx
- Lista de clientes
- CRUD de clientes
- Histórico de agendamentos por cliente

**Hooks:** `useClients`

### Funcionarios.tsx
- Lista de funcionários
- CRUD de funcionários
- Configurar horários e serviços

**Hooks:** `useEmployees`, `useEmployeeServices`

### Servicos.tsx
- Catálogo de serviços
- CRUD de serviços
- Preços e duração

**Hooks:** `useServices`

### Financeiro.tsx
- Entradas e saídas
- Relatório de faturamento
- Pagamentos de agendamentos

**Hooks:** `useFinancialEntries`, `useAppointments`

### Relatorios.tsx
- Geração de relatórios
- Exportação Excel/PDF
- Tipos: agendamentos, clientes, financeiro, desempenho

**Hooks:** `useAppointments`, `useClients`, `useServices`

### Configuracoes.tsx
- Informações da empresa
- Horário de funcionamento
- Configurações de notificação

**Hooks:** `useTenantSettings`

### Integracoes.tsx
- Integração WhatsApp
- Configurar instâncias
- Webhooks

**Hooks:** `useWhatsappApi`

### Notificacoes.tsx
- Central de notificações do sistema
- Tabs: Todas | Não lidas | Lidas
- Marcar como lida, excluir
- Acesso restrito a admin/manager

**Hooks:** `useUserNotifications`

### Onboarding.tsx
- Fluxo de configuração inicial
- 3 passos: empresa, horários, notificações
- Redirect para dashboard ao completar

**Hooks:** `useOnboardingStatus`, `useTenantSettings`

---

## Páginas Admin (admin/)

### admin/Dashboard.tsx
- Estatísticas globais
- Tenants ativos
- Métricas de uso

**Hooks:** `useAdminDashboard`

### admin/Empresas.tsx
- Lista de tenants/empresas
- Criar/editar tenants
- Ativar/desativar

**Hooks:** `useTenants`

### admin/Endpoints.tsx
- Gestão de endpoints de sistema
- URLs, status, configurações

**Hooks:** `useSystemEndpoints`

### admin/Notificacoes.tsx
- Criar/editar/excluir notificações do sistema
- Enviar para todos ou tenants específicos
- Tipos: info, warning, success, error
- Configurar expiração

**Hooks:** `useAdminNotifications`

### admin/Configuracoes.tsx
- Configurações globais
- Limites padrão
- Parâmetros do sistema

**Hooks:** `useSystemSettings`

---

## Padrão de Página

```typescript
import { MainLayout } from '@/components/layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { useEntities } from '@/hooks/useEntities'

const PageName = () => {
  const { user } = useAuth()
  const { data, isLoading } = useEntities()

  if (isLoading) return <div>Carregando...</div>

  return (
    <MainLayout>
      {/* Conteúdo da página */}
    </MainLayout>
  )
}

export default PageName
```

---

## Convenções

- Cada página usa `MainLayout` ou `AdminLayout` como wrapper
- Dados são carregados via hooks React Query
- Estados de loading e error são tratados
- Formulários usam React Hook Form + Zod
- Ações exibem toast de feedback (Sonner)
