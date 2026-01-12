import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'instance_disconnected' | 'appointment_created' | 'appointment_rescheduled' | 'appointment_cancelled';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

const STORAGE_KEY = 'cindy-ia-notifications';

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage
  useEffect(() => {
    if (profile?.tenant_id) {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${profile.tenant_id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNotifications(parsed.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          })));
        } catch (e) {
          console.error('Error parsing notifications:', e);
        }
      }
    }
  }, [profile?.tenant_id]);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Save notifications to localStorage
  const saveNotifications = useCallback((newNotifications: Notification[]) => {
    if (profile?.tenant_id) {
      localStorage.setItem(
        `${STORAGE_KEY}-${profile.tenant_id}`,
        JSON.stringify(newNotifications)
      );
    }
    setNotifications(newNotifications);
  }, [profile?.tenant_id]);

  // Add a new notification
  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, any>
  ) => {
    const newNotification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      data,
    };

    saveNotifications([newNotification, ...notifications].slice(0, 50)); // Keep last 50

    // Show toast for immediate feedback
    toast.info(title, {
      description: message,
    });
  }, [notifications, saveNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  // Subscribe to realtime appointment changes
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('appointments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          addNotification(
            'appointment_created',
            'Novo Agendamento',
            'Um novo agendamento foi criado.',
            payload.new
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;

          // Check if status changed to cancelled
          if (oldData.status !== 'cancelled' && newData.status === 'cancelled') {
            addNotification(
              'appointment_cancelled',
              'Agendamento Cancelado',
              'Um agendamento foi cancelado.',
              newData
            );
          }
          // Check if scheduled_at changed (rescheduled)
          else if (oldData.scheduled_at !== newData.scheduled_at) {
            addNotification(
              'appointment_rescheduled',
              'Agendamento Remarcado',
              'Um agendamento foi remarcado para outro horário.',
              newData
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, addNotification]);

  // Function to notify instance disconnection
  const notifyInstanceDisconnected = useCallback((instanceName: string) => {
    addNotification(
      'instance_disconnected',
      'Instância Desconectada',
      `A instância "${instanceName}" foi desconectada.`,
      { instanceName }
    );
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    notifyInstanceDisconnected,
  };
}
