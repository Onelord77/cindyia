# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CindyIA is a SaaS appointment scheduling and management platform for beauty salons, targeting the Brazilian market (pt-BR UI, UTC-3 timezone). It uses a multi-tenant architecture with role-based access control (super_admin, admin, manager, employee).

## Commands

```bash
npm run dev          # Start dev server (Vite, port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/UI

**Backend:** Supabase (PostgreSQL + Auth + Edge Functions in Deno)

**State Management:**
- Server state: TanStack React Query (via custom hooks in `src/hooks/`)
- Client state: Zustand

**Routing:** React Router DOM with role-based route protection in `src/App.tsx`

### Key Directories

- `src/pages/` — Page components matching routes (Dashboard, Agenda, Agendamentos, Clientes, etc.)
- `src/components/ui/` — Shadcn/UI base components (configured via `components.json`)
- `src/components/` — Feature-specific components grouped by domain (leads/, employees/, dashboard/, etc.)
- `src/hooks/` — Custom hooks wrapping Supabase queries with React Query (useAppointments, useClients, useServices, etc.)
- `src/integrations/supabase/` — Supabase client initialization and auto-generated types
- `supabase/functions/` — Edge Functions (Deno runtime) for backend logic (create-appointment, evolution-api, etc.)

### Patterns

- **Path alias:** `@/*` maps to `src/*`
- **Data fetching:** Custom hooks use `useQuery`/`useMutation` from React Query wrapping Supabase client calls
- **Forms:** React Hook Form + Zod for validation
- **Theming:** CSS variables with HSL colors, dark mode via `next-themes` class strategy
- **Multi-tenancy:** All database records are scoped by `tenant_id`
- **Auth context:** `src/hooks/useAuth.tsx` provides AuthProvider wrapping Supabase Auth
- **Notifications:** Sonner toast library
- **WhatsApp integration:** Evolution API connected via Supabase Edge Functions

### TypeScript Configuration

The project uses a loose TypeScript config (no strict mode, allows implicit any). Path resolution uses bundler module resolution targeting ES2020.

### Supabase Edge Functions

Located in `supabase/functions/`. Each function is a directory with an `index.ts` entry point running on Deno. Most functions have JWT verification disabled in `supabase/config.toml`.

## Timezone Handling

The app operates in UTC-3 (Brazilian timezone). When working with dates/times for appointments and schedules, ensure proper timezone conversion.
