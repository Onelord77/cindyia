# hooks/ - Custom Hooks

Hooks personalizados para gerenciamento de estado, dados e funcionalidades.

---

## Estrutura

```
hooks/
├── useAuth.tsx                          # Autenticação
├── useAgentApiKeys.ts                   # Chaves de API para agentes
├── useAppointments.ts                   # Agendamentos
├── useClients.ts                        # Clientes
├── useEmployees.ts                      # Funcionários
├── useEmployeeServices.ts               # Serviços por funcionário
├── useServices.ts                       # Serviços
├── useServiceCategories.ts              # Categorias de serviços
├── useFinancialEntries.ts               # Entradas financeiras
├── useSystemEndpoints.ts                # Endpoints de sistema
├── useTenants.ts                        # Tenants
├── useTenantLimits.ts                   # Limites do tenant
├── useUserManagement.ts                 # Gestão de usuários
├── useAdminDashboard.ts                 # Dashboard admin (metricas basicas)
├── useSaasDashboard.ts                  # Dashboard SaaS (MRR, churn, etc)
├── useAdminNotifications.ts             # Notificações do sistema (admin)
├── useUserNotifications.ts              # Notificações do usuário
├── useOnboardingStatus.ts               # Status de onboarding
├── useTenantSettings.ts                 # Configurações do tenant
├── useSystemSettings.ts                 # Configurações globais
├── useAppointmentsWithNotifications.ts  # Agendamentos com notificações
├── useWhatsappApi.ts                    # Integração WhatsApp
├── useWhatsappStatus.ts                 # Status WhatsApp do tenant logado
├── useAdminWhatsappStatus.ts            # Status WhatsApp de TODOS os tenants (super_admin)
├── use-mobile.tsx                       # Detectar mobile
└── use-toast.ts                         # Toast notifications
```

---

## Hooks de Autenticação

| Hook | Propósito | Retorno |
|------|-----------|---------|
| `useAuth` | Context de autenticação Supabase | `{ user, session, signIn, signOut, loading }` |

**Uso:**
```typescript
import { useAuth } from '@/hooks/useAuth'

const { user, signOut } = useAuth()
```

---

## Hooks de Entidades (React Query)

Todos usam TanStack React Query para cache e sincronização.

### useAppointments.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useAppointments()` | Query | Lista agendamentos do tenant |
| `useCreateAppointment()` | Mutation | Criar agendamento |
| `useUpdateAppointment()` | Mutation | Atualizar agendamento |
| `useDeleteAppointment()` | Mutation | Deletar agendamento |

### useClients.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useClients()` | Query | Lista clientes do tenant |
| `useCreateClient()` | Mutation | Criar cliente |
| `useUpdateClient()` | Mutation | Atualizar cliente |
| `useDeleteClient()` | Mutation | Deletar cliente |

### useEmployees.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useEmployees()` | Query | Lista funcionários do tenant |
| `useCreateEmployee()` | Mutation | Criar funcionário |
| `useUpdateEmployee()` | Mutation | Atualizar funcionário |
| `useDeleteEmployee()` | Mutation | Deletar funcionário |

### useEmployeeServices.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useEmployeeServices(employeeId)` | Query | Serviços de um funcionário |
| `useUpdateEmployeeServices()` | Mutation | Atualizar serviços do funcionário |

### useServices.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useServices()` | Query | Lista serviços do tenant (com categoria) |
| `useCreateService()` | Mutation | Criar serviço |
| `useUpdateService()` | Mutation | Atualizar serviço |
| `useDeleteService()` | Mutation | Deletar serviço |

**Tipos exportados:**
- `ServiceWithCategory` - Serviço com dados da categoria relacionada

### useServiceCategories.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useServiceCategories()` | Query | Lista categorias de serviços do tenant |
| `addCategory` | Mutation | Criar categoria |
| `updateCategory` | Mutation | Atualizar categoria |
| `deleteCategory` | Mutation | Deletar categoria |

**Tipos exportados:**
- `ServiceCategory` - Interface da categoria (id, name, color, sort_order)

### useFinancialEntries.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useFinancialEntries()` | Query | Lista entradas financeiras |
| `useCreateFinancialEntry()` | Mutation | Criar entrada |
| `useUpdateFinancialEntry()` | Mutation | Atualizar entrada |
| `useDeleteFinancialEntry()` | Mutation | Deletar entrada |

### useReportData.ts

Hook para dados de relatórios (sem limitação de período como useAppointments).

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useReportData(dateRange?)` | Query | Dados processados para relatórios |

**Retorno:**
- `totalRevenue` - Receita total do período
- `totalExpenses` - Despesas totais do período
- `totalAppointments` - Total de agendamentos
- `completedAppointments` - Agendamentos concluídos
- `cancelledAppointments` - Agendamentos cancelados
- `ticketMedio` - Ticket médio (receita / agendamentos concluídos)
- `cancelRate` - Taxa de cancelamento em %
- `dailyData` - Dados diários para gráficos (receita + despesa)
- `serviceData` - Serviços mais realizados
- `weekdayData` - Distribuição por dia da semana
- `expenseCategoryData` - Despesas por categoria
- `incomeCategoryData` - Receitas por categoria
- `isLoading` - Estado de carregamento

**Uso:**
```typescript
import { useReportData } from '@/hooks/useReportData'

const reportData = useReportData(dateRange)
console.log(reportData.totalRevenue)
console.log(reportData.dailyData) // [{ name: '01/01', receita: 100, despesa: 50 }]
```

---

## Hooks de Configuração

### useTenantSettings.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useTenantSettings()` | Query | Configurações do tenant |
| `useUpdateTenantSettings()` | Mutation | Atualizar configurações |

### useSystemSettings.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useSystemSettings()` | Query | Configurações globais (admin) |
| `useUpdateSystemSettings()` | Mutation | Atualizar configurações globais |

### useTenantLimits.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useTenantLimits()` | Query | Limites de uso do tenant |

---

## Hooks Admin

### useTenants.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useTenants()` | Query | Lista todos os tenants (admin) |
| `useCreateTenant()` | Mutation | Criar tenant |
| `useUpdateTenant()` | Mutation | Atualizar tenant |

### useUserManagement.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useUsers()` | Query | Lista usuários |
| `useCreateUser()` | Mutation | Criar usuário |
| `useUpdateUser()` | Mutation | Atualizar usuário |
| `useDeleteUser()` | Mutation | Deletar usuário |

### useAdminDashboard.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useAdminDashboard()` | Query | Estatísticas básicas do dashboard admin |

### useSaasDashboard.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useSaasDashboard()` | Query | Métricas SaaS completas (MRR, churn, ARPU) |

**Retorno:**
- `mrr` - Receita Recorrente Mensal (soma de monthly_fee dos tenants ativos)
- `activeTenants` - Número de tenants ativos
- `newTenantsThisMonth` - Novos tenants no mês atual
- `churnedTenantsThisMonth` - Tenants que churned no mês
- `revenuePerTenant` - ARPU (MRR / tenants ativos)
- `mrrGrowthPercent` - Crescimento % do MRR vs mês anterior
- `tenantGrowthPercent` - Crescimento % de tenants vs mês anterior
- `mrrHistory` - Array histórico para gráficos (últimos 12 meses)
- `churnRate` - Taxa de churn em %
- `totalTenants` - Total de tenants na plataforma
- `inactiveTenants` - Tenants inativos

**Uso:**
```typescript
import { useSaasDashboard } from '@/hooks/useSaasDashboard'

const { data, isLoading } = useSaasDashboard()
console.log(data?.mrr) // 5000.00
console.log(data?.mrrHistory) // [{ month: 'jan/26', mrr: 4500, ... }]
```

### useAdminNotifications.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useAdminNotifications()` | Hook | CRUD completo de notificações do sistema |

**Retorno:**
- `notifications` - Lista de notificações com targets
- `tenants` - Lista de tenants para seleção de destino
- `isLoading` - Estado de carregamento
- `createNotification` - Mutation para criar notificação
- `updateNotification` - Mutation para atualizar notificação
- `deleteNotification` - Mutation para excluir notificação
- `toggleNotificationStatus` - Mutation para ativar/desativar

**Uso:**
```typescript
import { useAdminNotifications } from '@/hooks/useAdminNotifications'

const { notifications, createNotification } = useAdminNotifications()

// Criar notificação para todos os tenants
createNotification.mutate({
  title: 'Manutenção programada',
  message: 'Sistema ficará indisponível amanhã às 3h',
  type: 'warning',
  target_type: 'all',
})
```

### useSystemEndpoints.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useSystemEndpoints()` | Query | Lista endpoints de sistema |
| `useUpdateEndpoint()` | Mutation | Atualizar endpoint |

---

## Hooks de Integração

### useWhatsappApi.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useWhatsappInstances()` | Query | Lista instâncias WhatsApp |
| `useSendWhatsappMessage()` | Mutation | Enviar mensagem |

### useWhatsappStatus.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useWhatsappStatus()` | Query | Verifica status de conexão das instâncias WhatsApp |

**Retorno:**
- `hasInstances` - Se o tenant tem instâncias cadastradas
- `hasDisconnected` - Se há instâncias desconectadas
- `disconnectedNames` - Nomes das instâncias desconectadas
- `isLoading` - Estado de carregamento

### useAdminWhatsappStatus.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useAdminWhatsappStatus()` | Query | Status de TODAS as instâncias WhatsApp (apenas super_admin) |

**Retorno:**
- `instances` - Lista de instâncias com tenant_name
- `connectedInstances` / `disconnectedInstances`
- `connectedCount` / `disconnectedCount` / `totalCount`
- `tenantsWithIssues` - Empresas com instâncias desconectadas
- `hasDisconnected` - Se há alguma desconexão
- `refetch` - Recarregar status
- `isConnected(status)` - Helper para checar status

**Polling automático a cada 60s** para detectar desconexões rapidamente.

### useAgentApiKeys.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useAgentApiKeys()` | Query | Lista chaves de API do tenant |
| `createKey()` | Mutation | Criar nova chave (retorna chave plaintext) |
| `updateKey()` | Mutation | Atualizar nome/descrição da chave |
| `deleteKey()` | Mutation | Excluir chave |
| `toggleKey()` | Mutation | Ativar/desativar chave |

**Uso:**
```typescript
import { useAgentApiKeys } from '@/hooks/useAgentApiKeys'

const { apiKeys, createKey, deleteKey, toggleKey } = useAgentApiKeys()

// Criar chave (retorna { key, plainKey })
const result = await createKey({ name: 'Minha API', expires_at: null })
console.log(result.plainKey) // cky_abc123... (mostrar apenas uma vez!)
```

### useAppointmentsWithNotifications.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useAppointmentsWithNotifications()` | Query | Agendamentos + status de notificação |

### useUserNotifications.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useUserNotifications()` | Hook | Gestão de notificações do usuário |

**Retorno:**
- `notifications` - Lista de notificações com status de leitura
- `unreadCount` - Contador de não lidas
- `isLoading` - Estado de carregamento
- `isAdminOrManager` - Se o usuário tem permissão
- `markAsRead` - Mutation para marcar como lida
- `markAllAsRead` - Mutation para marcar todas como lidas
- `deleteNotification` - Mutation para excluir (soft delete)
- `deleteAllNotifications` - Mutation para excluir todas

**Nota:** Apenas usuários com role `admin` ou `manager` têm acesso às notificações do sistema.

**Uso:**
```typescript
import { useUserNotifications } from '@/hooks/useUserNotifications'

const { notifications, unreadCount, markAsRead } = useUserNotifications()

// Marcar como lida
markAsRead.mutate(notificationId)
```

---

## Hooks de Status

### useOnboardingStatus.ts

| Função | Tipo | Descrição |
|--------|------|-----------|
| `useOnboardingStatus()` | Query | Status do onboarding do tenant |
| `useCompleteOnboarding()` | Mutation | Marcar onboarding como completo |

---

## Hooks Utilitários

### use-mobile.tsx

```typescript
import { useIsMobile } from '@/hooks/use-mobile'

const isMobile = useIsMobile() // boolean
```

### use-toast.ts

```typescript
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()
toast({ title: 'Sucesso!', description: 'Operação realizada.' })
```

---

## Padrão de Implementação

Todos os hooks de entidades seguem este padrão:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Query
export const useEntities = () => {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
      if (error) throw error
      return data
    }
  })
}

// Mutation
export const useCreateEntity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newEntity) => {
      const { data, error } = await supabase
        .from('entities')
        .insert(newEntity)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    }
  })
}
```

---

## Convenções

- Hooks de query retornam `{ data, isLoading, error }`
- Hooks de mutation retornam `{ mutate, mutateAsync, isPending }`
- Todos os hooks de entidade invalidam cache após mutations
- Use `useAuth()` para obter `tenant_id` nas queries
