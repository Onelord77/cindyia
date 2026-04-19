# Templates de E-mail do Supabase

Templates HTML para os e-mails transacionais enviados pelo Supabase Auth.

## Arquivos

| Arquivo | Uso no Supabase (Authentication → Email Templates) |
|---------|----------------------------------------------------|
| `reset-password.html` | **Reset Password** |

## Princípios adotados (anti-spam)

- HTML inline simples, sem frameworks, sem `<script>`, sem fontes externas.
- Logo desenhada em texto (sem imagens hospedadas) para evitar bloqueios por proxy/Gmail.
- Paleta neutra com apenas o primário `#6366f1` (matching `--primary` do Tailwind/Shadcn).
- Razão texto/HTML balanceada; sem excesso de cor/negrito.
- Destinatário e motivo explícitos no rodapé (boas práticas CAN-SPAM/LGPD).
- Expiração e orientação "ignore se não foi você" reforçam legitimidade.

## Assunto sugerido

> **Redefinir sua senha - Cindy IA**

## Variáveis disponíveis no Supabase

- `{{ .ConfirmationURL }}` – URL completa de confirmação (inclui token + redirect)
- `{{ .Email }}` – e-mail do destinatário
- `{{ .SiteURL }}` – valor de *Site URL* configurado no projeto
- `{{ .Token }}` e `{{ .TokenHash }}` – raramente usados em HTML direto

## Fluxo de reset de senha

1. Usuário clica em "Esqueci minha senha" em `/login` → vai para `/esqueci-senha`.
2. Submete e-mail → front chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: ORIGIN + '/redefinir-senha' })`.
3. Supabase envia e-mail usando este template.
4. Usuário clica no botão → vai para `https://<project>.supabase.co/auth/v1/verify?...&redirect_to=<ORIGIN>/redefinir-senha`.
5. Supabase valida o token e redireciona para `/redefinir-senha` com sessão temporária.
6. Página mostra form de nova senha → `supabase.auth.updateUser({ password })`.
7. Após sucesso, faz signOut e redireciona para `/login`.
