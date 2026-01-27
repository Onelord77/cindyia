# utils/ - Utilidades Gerais

Funções utilitárias específicas para funcionalidades da aplicação.

---

## Estrutura

```
utils/
└── reportExport.ts          # Exportação de relatórios
```

---

## reportExport.ts

Funções para exportar relatórios em diferentes formatos.

### Funções Disponíveis

| Função | Descrição |
|--------|-----------|
| `exportToExcel(data, filename)` | Exporta dados para arquivo Excel (.xlsx) |
| `exportToPDF(data, filename, title)` | Exporta dados para arquivo PDF |
| `formatReportData(data, type)` | Formata dados para o formato de relatório |

### Tipos de Relatório

| Tipo | Dados |
|------|-------|
| `agendamentos` | Agendamentos com cliente, serviço, funcionário |
| `clientes` | Lista de clientes com histórico |
| `financeiro` | Entradas e saídas financeiras |
| `desempenho` | Métricas de desempenho por funcionário |
| `servicos` | Serviços mais realizados |
| `horarios` | Análise de horários de pico |

### Uso

```typescript
import { exportToExcel, exportToPDF } from '@/utils/reportExport'

// Exportar para Excel
await exportToExcel(appointments, 'relatorio-agendamentos')

// Exportar para PDF
await exportToPDF(appointments, 'relatorio-agendamentos', 'Relatório de Agendamentos')
```

---

## Dependências

- Utiliza bibliotecas de geração de Excel/PDF
- Formatação segue padrões brasileiros (pt-BR, BRL, datas)
