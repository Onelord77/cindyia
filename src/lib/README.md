# lib/ - Utilitários e Helpers

Funções utilitárias usadas em toda a aplicação.

---

## Estrutura

```
lib/
└── utils.ts                 # Helpers principais
```

---

## utils.ts

### Funções de Classe CSS

| Função | Descrição | Uso |
|--------|-----------|-----|
| `cn(...classes)` | Merge de classes Tailwind com clsx + tailwind-merge | `cn('px-4', condition && 'bg-red-500')` |

```typescript
import { cn } from '@/lib/utils'

<div className={cn('base-class', isActive && 'active-class')} />
```

---

### Funções de Formatação

| Função | Descrição | Exemplo |
|--------|-----------|---------|
| `formatCurrency(value)` | Formata para BRL | `formatCurrency(100)` → `R$ 100,00` |
| `formatPhone(phone)` | Formata telefone BR | `formatPhone('11999999999')` → `(11) 99999-9999` |
| `phoneToWhatsAppLink(phone)` | Gera link wa.me | `phoneToWhatsAppLink('11999999999')` → `https://wa.me/5511999999999` |

---

### Funções de Timezone (UTC-3 São Paulo)

A aplicação opera em horário de São Paulo. Use estas funções para manipulação de datas.

| Função | Descrição |
|--------|-----------|
| `toSaoPauloDateTime(date)` | Converte Date para horário SP |
| `createSaoPauloDate(year, month, day, hour?, minute?)` | Cria Date em SP |
| `getTimeInSaoPaulo(date)` | Retorna hora atual em SP |
| `formatTimeInSaoPaulo(date)` | Formata hora (HH:mm) |
| `getDayOfWeekInSaoPaulo(date)` | Retorna dia da semana (0-6) |
| `getDateInSaoPaulo(date)` | Retorna data formatada (YYYY-MM-DD) |
| `isSameDayInSaoPaulo(date1, date2)` | Compara se são o mesmo dia |
| `getTodayInSaoPaulo()` | Retorna data de hoje em SP |

**Exemplo:**
```typescript
import { getTodayInSaoPaulo, formatTimeInSaoPaulo } from '@/lib/utils'

const today = getTodayInSaoPaulo() // "2024-01-15"
const time = formatTimeInSaoPaulo(new Date()) // "14:30"
```

---

## Convenções

- Todas as funções são exportadas individualmente (named exports)
- Use `cn()` para qualquer classe condicional no Tailwind
- Sempre use os helpers de timezone para datas de agendamento
