-- Migration: Bucket de storage para logos/favicons de branding por tenant
-- Todos os campos em tenants.settings.branding são opcionais;
-- esta migration cria apenas a infraestrutura de armazenamento.
-- A função get_user_tenant_id já existe desde 20260109185622.

-- Bucket público: as URLs são acessíveis sem auth (necessário para tela de login
-- e para carregar logos antes da sessão estar ativa).
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Upload: apenas para arquivos na pasta do próprio tenant ({tenant_id}/*)
CREATE POLICY "tenant_branding_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Substituição (upsert): apenas na pasta do próprio tenant
CREATE POLICY "tenant_branding_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Deleção: apenas na pasta do próprio tenant
CREATE POLICY "tenant_branding_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Leitura autenticada: qualquer usuário logado pode ler (para multi-tenant no futuro)
CREATE POLICY "tenant_branding_read_auth" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'branding');

-- Leitura pública: necessário para exibir logo na tela de login (usuário não autenticado)
CREATE POLICY "public_branding_read" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'branding');
