-- Sistema de Notificações
-- Permite que super_admins enviem notificações para tenants
-- Apenas admins e managers dos tenants podem ver as notificações

-- 1. Tabela de notificações do sistema (criadas pelo super_admin)
CREATE TABLE public.system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de tenants alvo (quando target_type = 'specific')
CREATE TABLE public.system_notification_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, tenant_id)
);

-- 3. Tabela de recibos por usuário (status de leitura/exclusão)
CREATE TABLE public.user_notification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- 4. Função auxiliar para verificar se usuário é admin ou manager
CREATE OR REPLACE FUNCTION public.user_is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- 5. Habilitar RLS em todas as tabelas
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notification_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_receipts ENABLE ROW LEVEL SECURITY;

-- 6. Policies para system_notifications

-- Super admins podem fazer tudo
CREATE POLICY "Super admins can manage all system notifications"
  ON public.system_notifications
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins e managers podem ver notificações ativas e não expiradas direcionadas ao seu tenant
CREATE POLICY "Admins and managers can view targeted notifications"
  ON public.system_notifications
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND public.user_is_admin_or_manager(auth.uid())
    AND (
      target_type = 'all'
      OR EXISTS (
        SELECT 1 FROM public.system_notification_targets snt
        WHERE snt.notification_id = id
        AND snt.tenant_id = public.get_user_tenant_id(auth.uid())
      )
    )
  );

-- 7. Policies para system_notification_targets

-- Super admins podem gerenciar todos os targets
CREATE POLICY "Super admins can manage notification targets"
  ON public.system_notification_targets
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins e managers podem ver targets do seu tenant
CREATE POLICY "Admins and managers can view their tenant targets"
  ON public.system_notification_targets
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.user_is_admin_or_manager(auth.uid())
  );

-- 8. Policies para user_notification_receipts

-- Usuários podem gerenciar seus próprios recibos
CREATE POLICY "Users can manage their own notification receipts"
  ON public.user_notification_receipts
  FOR ALL
  USING (user_id = auth.uid());

-- Super admins podem ver todos os recibos
CREATE POLICY "Super admins can view all notification receipts"
  ON public.user_notification_receipts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 9. Triggers para updated_at
CREATE TRIGGER set_system_notifications_updated_at
  BEFORE UPDATE ON public.system_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 10. Índices para performance
CREATE INDEX idx_system_notifications_is_active ON public.system_notifications(is_active);
CREATE INDEX idx_system_notifications_expires_at ON public.system_notifications(expires_at);
CREATE INDEX idx_system_notifications_created_at ON public.system_notifications(created_at DESC);
CREATE INDEX idx_system_notification_targets_notification ON public.system_notification_targets(notification_id);
CREATE INDEX idx_system_notification_targets_tenant ON public.system_notification_targets(tenant_id);
CREATE INDEX idx_user_notification_receipts_user ON public.user_notification_receipts(user_id);
CREATE INDEX idx_user_notification_receipts_notification ON public.user_notification_receipts(notification_id);
CREATE INDEX idx_user_notification_receipts_read ON public.user_notification_receipts(read_at);
