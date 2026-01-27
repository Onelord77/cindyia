# types/ - Type Definitions

Interfaces e tipos TypeScript compartilhados na aplicação.

---

## Estrutura

```
types/
└── index.ts                 # Interfaces principais
```

---

## index.ts

### Entidades Principais

#### Tenant
```typescript
interface Tenant {
  id: string
  name: string
  slug: string
  phone?: string
  email?: string
  address?: string
  logo_url?: string
  created_at: string
  updated_at: string
}
```

#### Employee
```typescript
interface Employee {
  id: string
  tenant_id: string
  name: string
  email?: string
  phone?: string
  role: 'admin' | 'manager' | 'employee'
  avatar_url?: string
  is_active: boolean
  created_at: string
}
```

#### Service
```typescript
interface Service {
  id: string
  tenant_id: string
  name: string
  description?: string
  duration: number      // minutos
  price: number         // centavos
  is_active: boolean
  created_at: string
}
```

#### Client
```typescript
interface Client {
  id: string
  tenant_id: string
  name: string
  phone: string
  email?: string
  notes?: string
  status: 'active' | 'inactive'
  created_at: string
}
```

#### Appointment
```typescript
interface Appointment {
  id: string
  tenant_id: string
  client_id: string
  employee_id: string
  service_id: string
  start_time: string    // ISO 8601 com timezone
  end_time: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  notes?: string
  created_at: string
}
```

#### WorkSchedule
```typescript
interface WorkSchedule {
  id: string
  employee_id: string
  day_of_week: number   // 0 = domingo, 6 = sábado
  start_time: string    // HH:mm
  end_time: string
  is_working: boolean
}
```

---

### Enums

#### AppointmentStatus
```typescript
type AppointmentStatus =
  | 'scheduled'     // Agendado
  | 'confirmed'     // Confirmado
  | 'in_progress'   // Em andamento
  | 'completed'     // Concluído
  | 'cancelled'     // Cancelado
  | 'no_show'       // Não compareceu
```

#### PaymentStatus
```typescript
type PaymentStatus =
  | 'pending'       // Pendente
  | 'paid'          // Pago
  | 'refunded'      // Reembolsado
```

---

## Uso

```typescript
import type { Appointment, Client, Service } from '@/types'

const handleAppointment = (appointment: Appointment) => {
  // ...
}
```

---

## Notas

- Types do banco de dados são gerados automaticamente em `src/integrations/supabase/types.ts`
- Este arquivo contém interfaces de aplicação que podem ter campos adicionais ou transformados
- Prefira usar tipos do Supabase para operações de banco
- Use estes tipos para props de componentes e lógica de UI
