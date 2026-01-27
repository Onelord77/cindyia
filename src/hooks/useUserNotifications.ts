import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type SystemNotification = Database['public']['Tables']['system_notifications']['Row'];
type UserNotificationReceipt = Database['public']['Tables']['user_notification_receipts']['Row'];

export type SystemNotificationType = 'info' | 'warning' | 'success' | 'error';

export interface UserNotification extends SystemNotification {
  receipt?: UserNotificationReceipt;
  isRead: boolean;
}

export function useUserNotifications() {
  const { user, isAdmin, isManager } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrManager = isAdmin || isManager;

  // Fetch notifications visible to the user
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch notifications (RLS will filter based on user's tenant and role)
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      // Fetch user's receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('user_notification_receipts')
        .select('*')
        .eq('user_id', user.id);

      if (receiptsError) throw receiptsError;

      // Combine notifications with receipts
      const userNotifications: UserNotification[] = notificationsData
        .map(notification => {
          const receipt = receiptsData.find(r => r.notification_id === notification.id);
          return {
            ...notification,
            receipt,
            isRead: !!receipt?.read_at,
          };
        })
        // Filter out soft-deleted notifications
        .filter(notification => !notification.receipt?.deleted_at);

      return userNotifications;
    },
    enabled: !!user?.id && isAdminOrManager,
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if receipt exists
      const existing = notifications.find(n => n.id === notificationId)?.receipt;

      if (existing) {
        // Update existing receipt
        const { error } = await supabase
          .from('user_notification_receipts')
          .update({ read_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new receipt
        const { error } = await supabase
          .from('user_notification_receipts')
          .insert({
            notification_id: notificationId,
            user_id: user.id,
            read_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const unreadNotifications = notifications.filter(n => !n.isRead);

      for (const notification of unreadNotifications) {
        if (notification.receipt) {
          await supabase
            .from('user_notification_receipts')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notification.receipt.id);
        } else {
          await supabase
            .from('user_notification_receipts')
            .insert({
              notification_id: notification.id,
              user_id: user.id,
              read_at: new Date().toISOString(),
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
    onError: (error) => {
      toast.error('Erro ao marcar notificações como lidas');
      console.error('Error marking all as read:', error);
    },
  });

  // Delete notification (soft delete via receipt)
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const existing = notifications.find(n => n.id === notificationId)?.receipt;

      if (existing) {
        // Update existing receipt with deleted_at
        const { error } = await supabase
          .from('user_notification_receipts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new receipt with deleted_at
        const { error } = await supabase
          .from('user_notification_receipts')
          .insert({
            notification_id: notificationId,
            user_id: user.id,
            deleted_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
      toast.success('Notificação excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir notificação');
      console.error('Error deleting notification:', error);
    },
  });

  // Delete all notifications
  const deleteAllNotifications = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      for (const notification of notifications) {
        if (notification.receipt) {
          await supabase
            .from('user_notification_receipts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', notification.receipt.id);
        } else {
          await supabase
            .from('user_notification_receipts')
            .insert({
              notification_id: notification.id,
              user_id: user.id,
              deleted_at: new Date().toISOString(),
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
      toast.success('Todas as notificações foram excluídas');
    },
    onError: (error) => {
      toast.error('Erro ao excluir notificações');
      console.error('Error deleting all notifications:', error);
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    isAdminOrManager,
  };
}
