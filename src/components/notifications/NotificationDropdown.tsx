import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Trash2, Calendar, CalendarX, CalendarClock, WifiOff, Info, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, NotificationType } from './NotificationProvider';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Icons for transient notifications (from context)
const transientNotificationIcons: Record<NotificationType, React.ElementType> = {
  instance_disconnected: WifiOff,
  appointment_created: Calendar,
  appointment_rescheduled: CalendarClock,
  appointment_cancelled: CalendarX,
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

// Colors for transient notifications
const transientNotificationColors: Record<NotificationType, string> = {
  instance_disconnected: 'text-destructive bg-destructive/10',
  appointment_created: 'text-success bg-success/10',
  appointment_rescheduled: 'text-warning bg-warning/10',
  appointment_cancelled: 'text-destructive bg-destructive/10',
  info: 'text-blue-500 bg-blue-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  success: 'text-green-500 bg-green-500/10',
  error: 'text-red-500 bg-red-500/10',
};

// Icons for system notifications (from database)
const systemNotificationIcons: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const systemNotificationColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  success: 'text-green-500 bg-green-500/10',
  error: 'text-red-500 bg-red-500/10',
};

interface CombinedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source: 'transient' | 'system';
}

export function NotificationDropdown() {
  // Transient notifications from context (in-memory)
  const {
    notifications: transientNotifications,
    unreadCount: transientUnreadCount,
    markAsRead: markTransientAsRead,
    markAllAsRead: markAllTransientAsRead,
    clearNotification: clearTransientNotification,
    clearAllNotifications: clearAllTransientNotifications,
  } = useNotifications();

  // System notifications from database
  const {
    notifications: systemNotifications,
    unreadCount: systemUnreadCount,
    isAdminOrManager,
    markAsRead: markSystemAsRead,
    markAllAsRead: markAllSystemAsRead,
    deleteNotification: deleteSystemNotification,
    deleteAllNotifications: deleteAllSystemNotifications,
  } = useUserNotifications();

  // Combine all notifications
  const allNotifications: CombinedNotification[] = useMemo(() => {
    const transient: CombinedNotification[] = transientNotifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: n.read,
      source: 'transient' as const,
    }));

    const system: CombinedNotification[] = isAdminOrManager
      ? systemNotifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.created_at ? parseISO(n.created_at) : new Date(),
          read: n.isRead,
          source: 'system' as const,
        }))
      : [];

    // Combine and sort by timestamp (newest first)
    return [...transient, ...system].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [transientNotifications, systemNotifications, isAdminOrManager]);

  // Total unread count
  const totalUnreadCount = transientUnreadCount + (isAdminOrManager ? systemUnreadCount : 0);

  const handleMarkAsRead = (notification: CombinedNotification) => {
    if (notification.source === 'transient') {
      markTransientAsRead(notification.id);
    } else {
      markSystemAsRead.mutate(notification.id);
    }
  };

  const handleClearNotification = (e: React.MouseEvent, notification: CombinedNotification) => {
    e.stopPropagation();
    if (notification.source === 'transient') {
      clearTransientNotification(notification.id);
    } else {
      deleteSystemNotification.mutate(notification.id);
    }
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    markAllTransientAsRead();
    if (isAdminOrManager && systemUnreadCount > 0) {
      markAllSystemAsRead.mutate();
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    clearAllTransientNotifications();
    if (isAdminOrManager && systemNotifications.length > 0) {
      deleteAllSystemNotifications.mutate();
    }
  };

  const getIcon = (notification: CombinedNotification) => {
    if (notification.source === 'transient') {
      return transientNotificationIcons[notification.type as NotificationType] || Bell;
    }
    return systemNotificationIcons[notification.type] || Info;
  };

  const getColorClass = (notification: CombinedNotification) => {
    if (notification.source === 'transient') {
      return transientNotificationColors[notification.type as NotificationType] || 'text-muted-foreground bg-muted';
    }
    return systemNotificationColors[notification.type] || 'text-blue-500 bg-blue-500/10';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalUnreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {allNotifications.length > 0 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar lidas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs text-destructive"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {allNotifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px]">
              {allNotifications.slice(0, 10).map((notification) => {
                const Icon = getIcon(notification);
                const colorClass = getColorClass(notification);

                return (
                  <DropdownMenuItem
                    key={`${notification.source}-${notification.id}`}
                    className={cn(
                      'flex items-start gap-3 p-3 cursor-pointer',
                      !notification.read && 'bg-muted/50'
                    )}
                    onClick={() => handleMarkAsRead(notification)}
                  >
                    <div className={cn('rounded-full p-2 mt-0.5', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => handleClearNotification(e, notification)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>

            {/* Link to full notifications page */}
            {isAdminOrManager && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Link to="/notificacoes">
                    <Button variant="ghost" size="sm" className="w-full justify-center text-xs">
                      Ver todas as notificações
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
