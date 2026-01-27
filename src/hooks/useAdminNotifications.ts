import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type SystemNotification = Database['public']['Tables']['system_notifications']['Row'];
type SystemNotificationInsert = Database['public']['Tables']['system_notifications']['Insert'];
type SystemNotificationUpdate = Database['public']['Tables']['system_notifications']['Update'];
type Tenant = Database['public']['Tables']['tenants']['Row'];

export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type TargetType = 'all' | 'specific';

export interface NotificationWithTargets extends SystemNotification {
  targets?: { tenant_id: string; tenant_name: string }[];
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type: NotificationType;
  target_type: TargetType;
  target_tenant_ids?: string[];
  expires_at?: string | null;
}

export interface UpdateNotificationInput extends CreateNotificationInput {
  id: string;
  is_active?: boolean;
}

export function useAdminNotifications() {
  const { isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notifications with their targets
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      // Fetch targets with tenant names
      const { data: targetsData, error: targetsError } = await supabase
        .from('system_notification_targets')
        .select(`
          notification_id,
          tenant_id,
          tenants:tenant_id (name)
        `);

      if (targetsError) throw targetsError;

      // Combine notifications with their targets
      const notificationsWithTargets: NotificationWithTargets[] = notificationsData.map(notification => {
        const targets = targetsData
          .filter(t => t.notification_id === notification.id)
          .map(t => ({
            tenant_id: t.tenant_id,
            tenant_name: (t.tenants as { name?: string } | null)?.name || 'Desconhecido'
          }));

        return {
          ...notification,
          targets: notification.target_type === 'specific' ? targets : undefined
        };
      });

      return notificationsWithTargets;
    },
    enabled: isSuperAdmin,
  });

  // Fetch all tenants for the target selection
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-for-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data as Tenant[];
    },
    enabled: isSuperAdmin,
  });

  // Create notification
  const createNotification = useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      // Create the notification
      const { data: notification, error: notificationError } = await supabase
        .from('system_notifications')
        .insert({
          title: input.title,
          message: input.message,
          type: input.type,
          target_type: input.target_type,
          expires_at: input.expires_at,
          created_by: user?.id,
        })
        .select()
        .single();

      if (notificationError) throw notificationError;

      // If targeting specific tenants, create the targets
      if (input.target_type === 'specific' && input.target_tenant_ids?.length) {
        const targetsToInsert = input.target_tenant_ids.map(tenant_id => ({
          notification_id: notification.id,
          tenant_id,
        }));

        const { error: targetsError } = await supabase
          .from('system_notification_targets')
          .insert(targetsToInsert);

        if (targetsError) throw targetsError;
      }

      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notificação criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar notificação: ' + error.message);
    },
  });

  // Update notification
  const updateNotification = useMutation({
    mutationFn: async (input: UpdateNotificationInput) => {
      const { id, target_tenant_ids, ...updates } = input;

      // Update the notification
      const { data: notification, error: notificationError } = await supabase
        .from('system_notifications')
        .update({
          title: updates.title,
          message: updates.message,
          type: updates.type,
          target_type: updates.target_type,
          expires_at: updates.expires_at,
          is_active: updates.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (notificationError) throw notificationError;

      // Delete existing targets
      const { error: deleteError } = await supabase
        .from('system_notification_targets')
        .delete()
        .eq('notification_id', id);

      if (deleteError) throw deleteError;

      // If targeting specific tenants, create new targets
      if (updates.target_type === 'specific' && target_tenant_ids?.length) {
        const targetsToInsert = target_tenant_ids.map(tenant_id => ({
          notification_id: id,
          tenant_id,
        }));

        const { error: targetsError } = await supabase
          .from('system_notification_targets')
          .insert(targetsToInsert);

        if (targetsError) throw targetsError;
      }

      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notificação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar notificação: ' + error.message);
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notificação excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir notificação: ' + error.message);
    },
  });

  // Toggle notification active status
  const toggleNotificationStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('system_notifications')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Status da notificação atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  return {
    notifications,
    tenants,
    isLoading,
    error,
    createNotification,
    updateNotification,
    deleteNotification,
    toggleNotificationStatus,
  };
}
