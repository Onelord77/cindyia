# src/ - Código-Fonte Principal

Este diretório contém todo o código-fonte React/TypeScript da aplicação.

---

## Estrutura

```
src/
├── App.tsx                  # Componente root + definição de rotas
├── App.css                  # Estilos globais da app
├── main.tsx                 # Entry point React
├── index.css                # Estilos CSS globais (Tailwind)
├── vite-env.d.ts            # Type declarations Vite
├── components/              # Componentes React (ver components/README.md)
├── hooks/                   # Custom hooks (ver hooks/README.md)
├── pages/                   # Páginas/Rotas (ver pages/README.md)
├── integrations/            # Integrações externas
├── lib/                     # Utilitários
├── types/                   # Type definitions
└── utils/                   # Utilidades gerais
```

---

## Arquivos Raiz

| Arquivo | Propósito |
|---------|-----------|
| `App.tsx` | Componente principal, define todas as rotas com React Router |
| `App.css` | Estilos CSS específicos da aplicação |
| `main.tsx` | Entry point, monta React no DOM |
| `index.css` | Configuração Tailwind CSS + variáveis CSS |
| `vite-env.d.ts` | Declarações de tipos para Vite |

---

## Subdiretórios

### [components/](components/README.md)
Componentes React organizados por domínio:
- `ui/` - Componentes base Shadcn/UI (65+)
- `layout/` - Header, Sidebar, MainLayout
- `dashboard/` - Cards, gráficos do dashboard
- `employees/` - Componentes de funcionários
- `reports/` - Relatórios
- `onboarding/` - Fluxo de onboarding
- `notifications/` - Sistema de notificações
- `theme/` - ThemeProvider, ThemeToggle

### [hooks/](hooks/README.md)
Custom hooks para gerenciamento de estado e dados:
- Hooks de entidades (useAppointments, useClients, etc.)
- Hooks de autenticação (useAuth)
- Hooks de configuração (useTenantSettings)
- Hooks utilitários (use-mobile, use-toast)

### [pages/](pages/README.md)
Componentes de página correspondentes às rotas:
- Páginas de tenant (Dashboard, Agenda, Clientes, etc.)
- Páginas admin (`admin/`)
- Páginas de autenticação (Login, Onboarding)

### [integrations/](integrations/README.md)
Integrações com serviços externos (Supabase).

### [lib/](lib/README.md)
Utilitários e helpers (cn, formatCurrency, timezone).

### [types/](types/README.md)
Type definitions TypeScript compartilhadas.

### [utils/](utils/README.md)
Utilidades específicas (exportação de relatórios).

---

## Path Alias

O alias `@/*` mapeia para `src/*`:

```typescript
// Ao invés de:
import { Button } from '../../../components/ui/button'

// Use:
import { Button } from '@/components/ui/button'
```

---

## Convenções

| Tipo | Convenção |
|------|-----------|
| Componentes | PascalCase (`.tsx`) |
| Hooks | camelCase com prefixo `use` (`.ts`/`.tsx`) |
| Utilitários | camelCase (`.ts`) |
| Estilos | Tailwind CSS classes |
| Forms | React Hook Form + Zod |
