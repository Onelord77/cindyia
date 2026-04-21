# components/ - Componentes React

Biblioteca de componentes React organizados por domínio.

---

## Estrutura

```
components/
├── NavLink.tsx                    # Link de navegação customizado
├── ProtectedRoute.tsx             # HOC para proteção de rotas
├── appointments/                  # Componentes de Agendamento (ex: ClientQuickCreateDialog)
├── dashboard/                     # Componentes de Dashboard
├── employees/                     # Componentes de Funcionários
├── integrations/                  # Componentes de Integrações
├── layout/                        # Componentes de Layout
├── notifications/                 # Sistema de Notificações
├── onboarding/                    # Fluxo de Onboarding
├── reports/                       # Componentes de Relatórios
├── theme/                         # Sistema de Temas
└── ui/                            # Shadcn/UI Base Components
```

---

## Componentes Raiz

| Arquivo | Propósito |
|---------|-----------|
| `NavLink.tsx` | Link de navegação com estado ativo |
| `ProtectedRoute.tsx` | Wrapper para rotas protegidas por autenticação |

---

## dashboard/

Componentes do painel principal.

| Arquivo | Propósito |
|---------|-----------|
| `AppointmentsList.tsx` | Lista de próximos agendamentos |
| `MrrChart.tsx` | Gráfico de evolução do MRR (SaaS admin) |
| `RevenueChart.tsx` | Gráfico de receita semanal (tenant) |
| `SaasStatsCard.tsx` | Card de estatísticas SaaS com trend |
| `StatsCard.tsx` | Card de estatísticas/KPI básico |
| `TopServicesChart.tsx` | Gráfico de serviços mais populares |

---

## employees/

Componentes para gestão de funcionários.

| Arquivo | Propósito |
|---------|-----------|
| `BreaksEditor.tsx` | Editor de pausas/intervalos |
| `WorkingHoursEditor.tsx` | Editor de horário de trabalho |

---

## integrations/

Componentes para gestão de integrações externas.

| Arquivo | Propósito |
|---------|-----------|
| `ApiKeysManagement.tsx` | Gestão de chaves de API para agentes |
| `CreateApiKeyDialog.tsx` | Dialog para criar nova chave de API |
| `EndpointDetailsDialog.tsx` | Dialog com detalhes do endpoint + cURL |
| `EndpointFilters.tsx` | Filtros de busca de endpoints |
| `EndpointManagement.tsx` | Gestão completa de endpoints |
| `WhatsAppIntegration.tsx` | Gestão de instâncias WhatsApp |

---

## layout/

Componentes estruturais de layout.

| Arquivo | Propósito |
|---------|-----------|
| `Header.tsx` | Header principal do tenant |
| `MainLayout.tsx` | Layout wrapper para páginas de tenant |
| `Sidebar.tsx` | Menu lateral do tenant |
| `WhatsAppDisconnectAlert.tsx` | Popup de alerta quando WhatsApp está desconectado |
| `AdminHeader.tsx` | Header do painel admin |
| `AdminLayout.tsx` | Layout wrapper para páginas admin |
| `AdminSidebar.tsx` | Menu lateral admin |

---

## notifications/

Sistema de notificações com suporte a:
- **Notificações transientes** (in-memory): eventos da sessão atual
- **Notificações do sistema** (banco de dados): enviadas pelo admin para tenants

| Arquivo | Propósito |
|---------|-----------|
| `index.ts` | Exports do módulo |
| `NotificationDropdown.tsx` | Dropdown unificado (transientes + sistema) |
| `NotificationProvider.tsx` | Provider de contexto para notificações transientes |

**Nota:** Notificações do sistema são visíveis apenas para usuários com role `admin` ou `manager`.

---

## onboarding/

Fluxo de configuração inicial.

| Arquivo | Propósito |
|---------|-----------|
| `CompanyInfoStep.tsx` | Passo 1: Informações da empresa |
| `ScheduleStep.tsx` | Passo 2: Configurar horários |
| `NotificationsStep.tsx` | Passo 3: Configurar notificações |
| `StepIndicator.tsx` | Indicador de progresso dos passos |

---

## reports/

Componentes de relatórios (3 relatórios principais).

| Arquivo | Propósito |
|---------|-----------|
| `index.ts` | Exports do módulo |
| `ReportFinanceiro.tsx` | Relatório financeiro (receitas, despesas, lucro) |
| `ReportAgendamentos.tsx` | Relatório de agendamentos (status, taxa de conclusão) |
| `ReportDesempenho.tsx` | Relatório de desempenho (ticket médio, ROI, eficiência) |

---

## theme/

Sistema de temas (light/dark).

| Arquivo | Propósito |
|---------|-----------|
| `index.ts` | Exports do módulo |
| `ThemeProvider.tsx` | Provider de contexto de tema |
| `ThemeToggle.tsx` | Botão toggle de tema |

---

## ui/

Componentes base Shadcn/UI (65+ componentes).

### Componentes Principais

| Arquivo | Propósito |
|---------|-----------|
| `accordion.tsx` | Accordion expansível |
| `alert.tsx` | Alertas |
| `alert-dialog.tsx` | Dialog de confirmação |
| `avatar.tsx` | Avatar de usuário |
| `badge.tsx` | Badges/tags |
| `button.tsx` | Botões |
| `calendar.tsx` | Calendário |
| `card.tsx` | Cards |
| `checkbox.tsx` | Checkbox |
| `collapsible.tsx` | Seção colapsável |
| `command.tsx` | Command palette |
| `context-menu.tsx` | Menu de contexto |
| `dialog.tsx` | Modal/Dialog |
| `dropdown-menu.tsx` | Menu dropdown |
| `form.tsx` | Form helpers (React Hook Form) |
| `hover-card.tsx` | Card no hover |
| `input.tsx` | Input de texto |
| `input-otp.tsx` | Input OTP |
| `label.tsx` | Label |
| `menubar.tsx` | Barra de menu |
| `navigation-menu.tsx` | Menu de navegação |
| `pagination.tsx` | Paginação |
| `popover.tsx` | Popover |
| `progress.tsx` | Barra de progresso |
| `radio-group.tsx` | Grupo de radio buttons |
| `resizable.tsx` | Painéis redimensionáveis |
| `scroll-area.tsx` | Área de scroll |
| `select.tsx` | Select dropdown |
| `separator.tsx` | Separador |
| `sheet.tsx` | Sheet/Drawer lateral |
| `sidebar.tsx` | Sidebar configurável |
| `skeleton.tsx` | Skeleton loading |
| `slider.tsx` | Slider |
| `switch.tsx` | Switch toggle |
| `table.tsx` | Tabela |
| `tabs.tsx` | Tabs |
| `textarea.tsx` | Textarea |
| `toast.tsx` | Toast notifications |
| `toaster.tsx` | Container de toasts |
| `toggle.tsx` | Toggle button |
| `toggle-group.tsx` | Grupo de toggles |
| `tooltip.tsx` | Tooltip |

### Componentes Especializados

| Arquivo | Propósito |
|---------|-----------|
| `chart.tsx` | Wrapper Recharts |
| `carousel.tsx` | Carousel (Embla) |
| `date-range-picker.tsx` | Seletor de período |
| `mobile-card.tsx` | Card responsivo para listagens mobile |
| `sonner.tsx` | Sonner toast config |
| `use-toast.ts` | Hook de toast |
| `whatsapp-icon.tsx` | Ícone oficial do WhatsApp (SVG) |

---

## Uso

```typescript
// Importar componente UI
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Importar componente de layout
import { MainLayout } from '@/components/layout/MainLayout'

// Importar componente de domínio
import { StatsCard } from '@/components/dashboard/StatsCard'
```

---

## Convenções

- Todos os componentes usam **Tailwind CSS** para estilos
- Componentes UI seguem o padrão **Shadcn/UI** com Radix primitives
- Use `cn()` de `@/lib/utils` para merge de classes condicionais
- Props são tipadas com TypeScript interfaces
- Use `useIsMobile()` de `@/hooks/use-mobile` para renderização condicional mobile
- Breakpoints: `sm` (640px), `md` (768px - mobile breakpoint), `lg` (1024px)
