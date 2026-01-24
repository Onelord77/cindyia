# UaZapi - WhatsApp API Documentation

## Base URL

```
https://cindyia.uazapi.com
```

## Autenticacao

Dois tipos de autenticacao:

### 1. Admin Token (operacoes administrativas)
- Header: `admintoken`
- Valor: `9GibDEMCoIka9eTNWVJhmLCgmgke732t1Xle3ZcvslWm6fJeVd`
- Usado em: criar instancia, listar instancias

### 2. Instance Token (operacoes por instancia)
- Header: `token`
- Valor: retornado no campo `token` (top-level) da resposta do `/instance/init`
- Formato: UUID (ex: `123e4567-e89b-12d3-a456-426614174000`)
- Usado em: connect, disconnect, status, delete
- **IMPORTANTE:** Guardar o token apos criar a instancia, pois eh necessario para todas as operacoes

---

## Endpoints

### 1. Criar Instancia

```
POST /instance/init
```

**Headers:**
- `Content-Type: application/json`
- `Accept: application/json`
- `admintoken: {admin_token}`

**Body:**
```json
{
  "name": "minha-instancia",
  "systemName": "apilocal",
  "adminField01": "custom-metadata-1",
  "adminField02": "custom-metadata-2",
  "fingerprintProfile": "chrome",
  "browser": "chrome"
}
```

- `name` (required): Nome da instancia
- `systemName` (optional): Nome do sistema (padrao 'uazapiGO')
- `adminField01` (optional): Metadado customizado 1
- `adminField02` (optional): Metadado customizado 2
- `fingerprintProfile` (optional): Perfil de fingerprint
- `browser` (optional): Tipo de navegador

**Resposta (200):**
```json
{
  "response": "Instance created successfully",
  "instance": {
    "id": "i91011ijkl",
    "token": "abc123xyz",
    "status": "disconnected",
    "name": "minha-instancia",
    "profileName": "",
    "profilePicUrl": "",
    "isBusiness": false,
    "plataform": "",
    "systemName": "apilocal",
    "owner": "",
    "adminField01": "custom-metadata-1",
    "created": "2025-01-24T14:00:00Z",
    "updated": "2025-01-24T14:00:00Z"
  },
  "connected": false,
  "loggedIn": false,
  "name": "minha-instancia",
  "token": "123e4567-e89b-12d3-a456-426614174000",
  "info": "This instance will be automatically disconnected and deleted after 1 hour."
}
```

**IMPORTANTE:** O campo `token` (top-level) eh o token de autenticacao da instancia. Guardar para usar nas demais operacoes.

**Erros:**
- 401: Token admin invalido/expirado
- 500: Erro interno

---

### 2. Conectar Instancia (Gerar QR Code)

```
POST /instance/connect
```

**Headers:**
- `Content-Type: application/json`
- `Accept: application/json`
- `token: {instance_token}`

**Body (opcional):**
```json
{
  "phone": "5511999999999"
}
```

- Sem `phone`: gera QR code
- Com `phone`: gera codigo de pareamento

**Timeout:**
- QR Code: 2 minutos
- Codigo de pareamento: 5 minutos

**Resposta (200):**
```json
{
  "connected": false,
  "loggedIn": false,
  "jid": null,
  "instance": {
    "id": "i91011ijkl",
    "token": "abc123xyz",
    "status": "connected",
    "paircode": "1234-5678",
    "qrcode": "data:image/png;base64,iVBORw0KGg...",
    "name": "Instancia Principal",
    "profileName": "Loja ABC",
    "profilePicUrl": "https://example.com/profile.jpg",
    "isBusiness": true,
    "plataform": "Android",
    "systemName": "uazapi",
    "owner": "user@example.com",
    "lastDisconnect": "2025-01-24T14:00:00Z",
    "lastDisconnectReason": "Network error",
    "adminField01": "custom_data",
    "openai_apikey": "sk-...xyz",
    "chatbot_enabled": true,
    "chatbot_ignoreGroups": true,
    "chatbot_stopConversation": "parar",
    "chatbot_stopMinutes": 60,
    "created": "2025-01-24T14:00:00Z",
    "updated": "2025-01-24T14:30:00Z",
    "currentPresence": "available"
  }
}
```

**Erros:**
- 401: Token invalido/expirado
- 404: Instancia nao encontrada
- 429: Limite de conexoes simultaneas atingido
- 500: Erro interno

---

### 3. Verificar Status da Instancia

```
GET /instance/status
```

**Headers:**
- `Accept: application/json`
- `token: {instance_token}`

**Retorna:**
- Estado da conexao (disconnected, connecting, connected)
- QR code atualizado (se em processo de conexao)
- Codigo de pareamento (se disponivel)
- Informacoes da ultima desconexao
- Detalhes completos da instancia

**Erros:**
- 401: Token invalido/expirado
- 404: Instancia nao encontrada
- 500: Erro interno

---

### 4. Desconectar Instancia

```
POST /instance/disconnect
```

**Headers:**
- `Accept: application/json`
- `token: {instance_token}`

**Body:** Nenhum

**Comportamento:**
- Encerra a conexao ativa
- Requer novo QR code para reconectar
- Diferente de hibernar (que mantém sessao ativa)

**Erros:**
- 401: Token invalido/expirado
- 404: Instancia nao encontrada
- 500: Erro interno

---

### 5. Deletar Instancia

```
DELETE /instance
```

**Headers:**
- `Accept: application/json`
- `token: {instance_token}`

**Body:** Nenhum

**Erros:**
- 401: Falha na autenticacao
- 404: Instancia nao encontrada
- 500: Erro interno

---

---

## Escopo da Integracao

A aplicacao utiliza a UaZapi apenas para:
- **Criar** instancias WhatsApp
- **Conectar** (gerar QR code)
- **Verificar status** da conexao
- **Desconectar** instancias
- **Deletar** instancias

NAO envia mensagens pela API.

---

## Estados da Instancia

| Estado | Descricao |
|--------|-----------|
| `disconnected` | Desconectado do WhatsApp |
| `connecting` | Em processo de conexao (aguardando QR/pareamento) |
| `connected` | Conectado e autenticado |

## Campos da Instancia

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da instancia |
| `token` | string | Token de autenticacao da instancia |
| `status` | string | Estado atual (disconnected/connecting/connected) |
| `paircode` | string | Codigo de pareamento (se disponivel) |
| `qrcode` | string | QR code em base64 data URI |
| `name` | string | Nome da instancia |
| `profileName` | string | Nome do perfil WhatsApp |
| `profilePicUrl` | string | URL da foto de perfil |
| `isBusiness` | boolean | Se eh conta business |
| `plataform` | string | Plataforma (Android/iOS) |
| `systemName` | string | Nome do sistema |
| `owner` | string | Email do proprietario |
| `lastDisconnect` | string | Data da ultima desconexao |
| `lastDisconnectReason` | string | Motivo da ultima desconexao |
| `adminField01` | string | Campo customizado 1 |
| `created` | string | Data de criacao |
| `updated` | string | Data de atualizacao |

---

## Pendencias de Documentacao

- [x] Header name para token de instancia (`token`)
- [x] Resposta do `/instance/init` (criar instancia)
- [x] Escopo definido: apenas connect/disconnect/delete (sem envio de mensagens)
- [ ] Resposta do `/instance/status` (formato exato do JSON)
- [ ] Listar instancias (se existir endpoint admin)
