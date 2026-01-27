# Relatório de Auditoria de Código

**Projeto:** CindyIA - Plataforma SaaS de Agendamento para Salões
**Data:** 2026-01-27
**Escopo:** Frontend (React + TypeScript), Backend (Supabase Edge Functions)

---

## Sumário Executivo

| Categoria | Crítico | Alto | Médio | Baixo |
|-----------|:-------:|:----:|:-----:|:-----:|
| Segurança | 1 | 2 | 3 | 1 |
| Performance | 0 | 1 | 2 | 2 |
| Dead Code | 0 | 0 | 1 | 1 |
| Qualidade | 0 | 0 | 2 | 3 |
| **Total** | **1** | **3** | **8** | **7** |

### Principais Descobertas

1. **[CRÍTICO]** Credenciais hardcoded expostas em edge function (whatsapp-api)
2. **[ALTO]** Geração de API keys usando `Math.random()` (inseguro para criptografia)
3. **[ALTO]** JWT verification desativado em todas as edge functions públicas

---

## Problemas Críticos

### [SEC-001] Credenciais Hardcoded em Código Fonte

**Categoria:** Segurança
**Severidade:** CRÍTICO
**Arquivo:** `supabase/functions/whatsapp-api/index.ts`
**Linha:** 15-16

**Descrição:**
Token de admin da API UaZapi está hardcoded diretamente no código fonte. Mesmo sendo usado como fallback, essa credencial pode ser exposta em repositórios, logs ou builds.

**Impacto:**
- Exposição de credencial de API externa
- Possibilidade de acesso não autorizado à API UaZapi
- Risco de comprometimento de todas as instâncias WhatsApp

**Código Atual:**
```typescript
// Problema
const UAZAPI_URL = Deno.env.get('UAZAPI_URL') || 'https://cindyia.uazapi.com';
const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN') || '9GibDEMCoIka9eTNWVJhmLCgmgke732t1Xle3ZcvslWm6fJeVd';
```

**Correção Recomendada:**
```typescript
// Solução
const UAZAPI_URL = Deno.env.get('UAZAPI_URL');
const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');

if (!UAZAPI_URL || !UAZAPI_ADMIN_TOKEN) {
  return new Response(
    JSON.stringify({ error: 'Configuração de WhatsApp não disponível' }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Passos para Correção:**
1. Remover valores fallback hardcoded
2. Configurar variáveis de ambiente no Supabase Dashboard
3. Rotacionar o token exposto imediatamente
4. Adicionar validação de variáveis obrigatórias

---

## Problemas de Alta Severidade

### [SEC-002] Geração de API Keys com Math.random()

**Categoria:** Segurança
**Severidade:** ALTO
**Arquivo:** `src/hooks/useAgentApiKeys.ts`
**Linha:** 27-35

**Descrição:**
A função `generateApiKey()` usa `Math.random()` para gerar chaves de API. `Math.random()` não é criptograficamente seguro e pode ser previsível.

**Impacto:**
- Chaves de API potencialmente previsíveis
- Possibilidade de brute-force ou adivinhação de chaves
- Comprometimento de acesso a recursos protegidos

**Código Atual:**
```typescript
// Problema
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'cky_';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
```

**Correção Recomendada:**
```typescript
// Solução - Usar crypto.getRandomValues()
function generateApiKey(): string {
  const prefix = 'cky_';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, 'x')
    .replace(/\//g, 'y')
    .replace(/=/g, '');
  return prefix + base64.substring(0, 32);
}
```

**Passos para Correção:**
1. Substituir `Math.random()` por `crypto.getRandomValues()`
2. Considerar aumentar o tamanho da chave para 48+ caracteres
3. Adicionar entropia adicional se necessário

---

### [SEC-003] JWT Verification Desativado em Edge Functions

**Categoria:** Segurança
**Severidade:** ALTO
**Arquivo:** `supabase/config.toml`
**Linha:** Todas as configurações de functions

**Descrição:**
Todas as edge functions têm `verify_jwt = false`, o que significa que não verificam automaticamente tokens JWT do Supabase Auth. Embora algumas funções implementem autenticação própria (x-agent-key), outras dependem apenas de validação manual.

**Impacto:**
- Bypass potencial de autenticação se validação manual falhar
- Superfície de ataque aumentada
- Dependência de implementação correta de auth em cada função

**Código Atual:**
```toml
# Problema - Todas as funções sem verificação JWT
[functions.create-user]
verify_jwt = false

[functions.delete-user]
verify_jwt = false

[functions.whatsapp-api]
verify_jwt = false
```

**Correção Recomendada:**
```toml
# Solução - Habilitar JWT para funções que requerem auth do usuário
[functions.create-user]
verify_jwt = true

[functions.delete-user]
verify_jwt = true

[functions.whatsapp-api]
verify_jwt = true

# Manter false apenas para APIs de agentes (usam x-agent-key)
[functions.create-appointment]
verify_jwt = false
```

**Passos para Correção:**
1. Identificar funções que requerem autenticação de usuário web
2. Habilitar `verify_jwt = true` para essas funções
3. Manter `verify_jwt = false` apenas para APIs de agentes externos
4. Testar todas as integrações após a mudança

---

### [PERF-001] Carregamento de Todos os Appointments sem Paginação

**Categoria:** Performance
**Severidade:** ALTO
**Arquivo:** `src/hooks/useAppointments.ts`
**Linha:** 25-45

**Descrição:**
O hook `useAppointments` carrega TODOS os agendamentos do tenant sem paginação ou limite. Para tenants com histórico extenso, isso pode causar problemas de performance.

**Impacto:**
- Tempo de carregamento lento para tenants com muitos agendamentos
- Alto consumo de memória no cliente
- Possível timeout em queries grandes

**Código Atual:**
```typescript
// Problema - Carrega todos os registros
const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    clients (id, name, phone, email),
    employees (id, name),
    services (id, name, price, duration)
  `)
  .eq('tenant_id', tenantId)
  .order('scheduled_at', { ascending: true });
```

**Correção Recomendada:**
```typescript
// Solução - Adicionar filtro de data e/ou paginação
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    clients (id, name, phone, email),
    employees (id, name),
    services (id, name, price, duration)
  `)
  .eq('tenant_id', tenantId)
  .gte('scheduled_at', thirtyDaysAgo.toISOString())
  .order('scheduled_at', { ascending: true })
  .limit(500);
```

**Passos para Correção:**
1. Adicionar filtro de data padrão (últimos 30-90 dias)
2. Implementar paginação ou infinite scroll
3. Criar query separada para histórico completo (sob demanda)

---

## Problemas de Média Severidade

### [SEC-004] CORS Permissivo (Access-Control-Allow-Origin: *)

**Categoria:** Segurança
**Severidade:** MÉDIO
**Arquivo:** Todas as edge functions
**Linha:** Headers CORS

**Descrição:**
Todas as edge functions permitem requisições de qualquer origem (`*`). Embora comum em desenvolvimento, em produção isso pode expor APIs a ataques CSRF de outros domínios.

**Código Atual:**
```typescript
// Problema
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  ...
}
```

**Correção Recomendada:**
```typescript
// Solução - Restringir a domínios conhecidos
const ALLOWED_ORIGINS = [
  'https://app.cindyia.com',
  'https://cindyia.com',
  Deno.env.get('ALLOWED_ORIGIN'),
].filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0],
  ...
});
```

---

### [SEC-005] dangerouslySetInnerHTML em Componente de Gráfico

**Categoria:** Segurança
**Severidade:** MÉDIO
**Arquivo:** `src/components/ui/chart.tsx`
**Linha:** 70

**Descrição:**
O componente usa `dangerouslySetInnerHTML` para injetar CSS dinâmico. Embora o conteúdo venha de configuração interna (THEMES), é uma prática que requer atenção.

**Impacto:**
- Baixo risco atual (dados são internos)
- Potencial XSS se configuração for modificada para aceitar input externo

**Mitigação:**
O risco é baixo porque:
- Os dados vêm de constantes definidas no código
- Não há input de usuário envolvido
- É um padrão comum para injeção de CSS dinâmico

---

### [SEC-006] Logs com console.error Expostos

**Categoria:** Segurança
**Severidade:** MÉDIO
**Arquivo:** Múltiplos arquivos (26 ocorrências)

**Descrição:**
Existem 26 chamadas `console.log/error/warn` no código de produção, algumas podem expor informações sensíveis ou detalhes de implementação.

**Correção Recomendada:**
1. Remover console.logs de debug em produção
2. Usar serviço de logging estruturado (ex: Sentry, LogRocket)
3. Garantir que erros não exponham stack traces ao usuário

---

### [PERF-002] Filtro + Map em Renderização

**Categoria:** Performance
**Severidade:** MÉDIO
**Arquivo:** Múltiplos arquivos (Agenda.tsx, Agendamentos.tsx, Funcionarios.tsx)

**Descrição:**
Padrão `.filter().map()` usado diretamente em JSX pode causar re-renderizações desnecessárias.

**Código Atual:**
```tsx
// Problema - Filtro executado em cada render
{services.filter(s => s.is_active).map(s => (
  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
))}
```

**Correção Recomendada:**
```tsx
// Solução - Usar useMemo
const activeServices = useMemo(
  () => services.filter(s => s.is_active),
  [services]
);

// No JSX
{activeServices.map(s => (
  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
))}
```

---

### [PERF-003] TypeScript em Modo Loose

**Categoria:** Qualidade
**Severidade:** MÉDIO
**Arquivo:** `tsconfig.json`

**Descrição:**
TypeScript está configurado em modo loose (sem strict mode), permitindo implicit any e outros padrões que podem esconder bugs.

**Impacto:**
- Bugs de tipo não detectados em compile time
- Menor confiabilidade do código
- Dificuldade de refatoração segura

**Correção Recomendada:**
Gradualmente habilitar opções strict:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

### [QUAL-001] Arquivos de Página Muito Grandes

**Categoria:** Qualidade
**Severidade:** MÉDIO
**Arquivos:**
- `Relatorios.tsx`: 874 linhas
- `admin/Empresas.tsx`: 777 linhas
- `Agendamentos.tsx`: 734 linhas
- `Funcionarios.tsx`: 685 linhas

**Descrição:**
Vários arquivos de página excedem 500 linhas, dificultando manutenção e testes.

**Correção Recomendada:**
1. Extrair lógica para custom hooks
2. Componentizar seções repetitivas
3. Separar formulários em componentes próprios

---

## Sugestões de Melhoria

### [OPT-001] Implementar Rate Limiting

**Categoria:** Segurança/Performance
**Severidade:** BAIXO

**Descrição:**
As edge functions não têm rate limiting implementado, o que pode permitir abuse de API.

**Sugestão:**
Implementar rate limiting usando Upstash Redis ou similar.

---

### [OPT-002] Adicionar Índices de Banco Explícitos

**Categoria:** Performance
**Severidade:** BAIXO

**Descrição:**
Verificar se existem índices para as colunas frequentemente usadas em WHERE e ORDER BY:
- `appointments.tenant_id + scheduled_at`
- `clients.tenant_id + phone`
- `agent_api_keys.key_hash`

---

### [OPT-003] Implementar Lazy Loading de Rotas

**Categoria:** Performance
**Severidade:** BAIXO

**Descrição:**
Implementar code splitting com React.lazy() para reduzir bundle inicial.

```typescript
const Relatorios = lazy(() => import('./pages/Relatorios'));
const AdminEmpresas = lazy(() => import('./pages/admin/Empresas'));
```

---

### [OPT-004] Remover Console Logs em Produção

**Categoria:** Qualidade
**Severidade:** BAIXO

**Descrição:**
26 ocorrências de console.log/error/warn encontradas. Configurar build para remover em produção.

---

### [OPT-005] ESLint no-unused-vars Desativado

**Categoria:** Qualidade
**Severidade:** BAIXO

**Descrição:**
A regra `@typescript-eslint/no-unused-vars` está desativada, permitindo variáveis não utilizadas no código.

---

## Dead Code Identificado

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/functions/services/` | Diretório deletado | Aparece no git status como deletado |

**Recomendação:** Verificar se a deleção foi intencional e fazer commit da remoção.

---

## Checklist de Correção

### Prioridade Imediata (Crítico)
- [ ] [SEC-001] Remover credenciais hardcoded e rotacionar token UaZapi

### Antes do Próximo Deploy (Alto)
- [ ] [SEC-002] Substituir Math.random() por crypto.getRandomValues()
- [ ] [SEC-003] Habilitar verify_jwt para funções admin (create-user, delete-user, whatsapp-api)
- [ ] [PERF-001] Adicionar filtro de data padrão em useAppointments

### Próximo Sprint (Médio)
- [ ] [SEC-004] Restringir CORS a domínios específicos
- [ ] [SEC-006] Implementar logging estruturado e remover console.logs
- [ ] [PERF-002] Memoizar filtros em componentes
- [ ] [PERF-003] Avaliar migração para TypeScript strict mode
- [ ] [QUAL-001] Refatorar páginas grandes (>500 linhas)

### Backlog (Baixo)
- [ ] [OPT-001] Implementar rate limiting nas edge functions
- [ ] [OPT-002] Revisar e otimizar índices do banco
- [ ] [OPT-003] Implementar lazy loading de rotas
- [ ] [OPT-004] Configurar remoção de console.logs em build
- [ ] [OPT-005] Reativar regra no-unused-vars do ESLint

---

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [React Performance Optimization](https://react.dev/reference/react/useMemo)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

*Relatório gerado por Code Audit Agent - Claude Code*
