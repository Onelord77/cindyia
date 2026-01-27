# integrations/ - Integrações Externas

Configuração e tipos para integrações com serviços externos.

---

## Estrutura

```
integrations/
└── supabase/
    ├── client.ts            # Inicialização do Supabase client
    └── types.ts             # Types auto-gerados do schema
```

---

## supabase/

### client.ts

Inicialização do cliente Supabase para uso no frontend.

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
  }
})
```

**Uso:**
```typescript
import { supabase } from '@/integrations/supabase/client'

// Query
const { data, error } = await supabase
  .from('appointments')
  .select('*')

// Insert
const { data, error } = await supabase
  .from('clients')
  .insert({ name: 'João' })
  .select()
  .single()
```

---

### types.ts

Types TypeScript auto-gerados do schema do banco de dados.

**Geração:**
```bash
supabase gen types typescript --project-id thdwtvjbbdclgddjiedz > src/integrations/supabase/types.ts
```

**Principais tipos:**

| Tipo | Descrição |
|------|-----------|
| `Database` | Schema completo do banco |
| `Tables` | Tipos das tabelas |
| `Enums` | Enums do banco |

**Uso:**
```typescript
import { Database } from '@/integrations/supabase/types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type NewAppointment = Database['public']['Tables']['appointments']['Insert']
```

---

## Variáveis de Ambiente

Configurar no arquivo `.env`:

```env
VITE_SUPABASE_URL=https://thdwtvjbbdclgddjiedz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
```
