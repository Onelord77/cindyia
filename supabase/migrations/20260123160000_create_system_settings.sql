-- Tabela de configurações globais do sistema (key-value)
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: apenas super_admin pode ler/escrever
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Seed: webhook URL padrão vazio
INSERT INTO public.system_settings (key, value)
VALUES ('whatsapp_webhook_url', '');
