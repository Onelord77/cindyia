import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bell, Check, Trash2, Loader2, Info, AlertTriangle, CheckCircle, XCircle,
  BellOff, Calendar, CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserNotifications, UserNotification, SystemNotificationType } from '@/hooks/useUserNotifications';
import { formatDistanceToNow, parseISO, isAfter, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCard } from '@/components/dashboard/StatsCard';

const typeConfig: Record<SystemNotificationType, { label: string; icon: React.ElementType; class: string }> = {
  info: { label: 'Informação', icon: Info, class: 'bg-blue-500/10 text-blue-500' },
  warning: { label: 'Aviso', icon: AlertTriangle, class: 'bg-amber-500/10 text-amber-500' },
  success: { label: 'Sucesso', icon: CheckCircle, class: 'bg-green-500/10 text-green-500' },
  error: { label: 'Erro', icon: XCircle, class: 'bg-red-500/10 text-red-500' },
};

const Notificacoes = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    isAdminOrManager,
  } = useUserNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'read':
        return notifications.filter(n => n.isRead);
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });

    return {
      total: notifications.length,
      unread: unreadCount,
      thisWeek: notifications.filter(n => n.created_at && isAfter(parseISO(n.created_at), weekStart)).length,
    };
  }, [notifications, unreadCount]);

  const handleMarkAsRead = async (notification: UserNotification) => {
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.id);
    }
  };

  const handleDelete = async () => {
    if (deletingNotificationId) {
      await deleteNotification.mutateAsync(deletingNotificationId);
      setDeletingNotificationId(null);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications.mutateAsync();
    setIsDeleteAllDialogOpen(false);
  };

  // If user is not admin or manager, show access denied message
  if (!isAdminOrManager && !isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <BellOff className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground text-center max-w-md">
            As notificações do sistema estão disponíveis apenas para administradores e gerentes.
          </p>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
            {unreadCount > 0 && (
              <Badge className="bg-primary">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                Marcar todas como lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteAllDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar todas
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard title="Total" value={stats.total} icon={<Bell className="h-5 w-5" />} />
          <StatsCard title="Não lidas" value={stats.unread} icon={<Bell className="h-5 w-5" />} />
          <StatsCard title="Esta semana" value={stats.thisWeek} icon={<Calendar className="h-5 w-5" />} />
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Não lidas ({unreadCount})</TabsTrigger>
            <TabsTrigger value="read">Lidas ({notifications.length - unreadCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'all' && 'Todas as notificações'}
                  {activeTab === 'unread' && 'Notificações não lidas'}
                  {activeTab === 'read' && 'Notificações lidas'}
                </CardTitle>
                <CardDescription>
                  {filteredNotifications.length === 0
                    ? 'Nenhuma notificação encontrada'
                    : `${filteredNotifications.length} notificação(ões)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {activeTab === 'unread' ? 'Você está em dia!' : 'Nenhuma notificação'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="divide-y">
                      {filteredNotifications.map((notification) => {
                        const typeInfo = typeConfig[notification.type as SystemNotificationType] || typeConfig.info;
                        const TypeIcon = typeInfo.icon;

                        return (
                          <div
                            key={notification.id}
                            className={cn(
                              'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                              !notification.isRead && 'bg-muted/30'
                            )}
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            <div className={cn('rounded-full p-2.5 shrink-0', typeInfo.class)}>
                              <TypeIcon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn(
                                  'text-sm',
                                  !notification.isRead ? 'font-semibold' : 'font-medium'
                                )}>
                                  {notification.title}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingNotificationId(notification.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  {notification.created_at && formatDistanceToNow(parseISO(notification.created_at), {
                                    addSuffix: true,
                                    locale: ptBR
                                  })}
                                </span>
                                <Badge variant="outline" className={cn('text-xs', typeInfo.class)}>
                                  {typeInfo.label}
                                </Badge>
                                {notification.isRead && (
                                  <span className="flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Lida
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Single Notification Dialog */}
        <AlertDialog open={!!deletingNotificationId} onOpenChange={() => setDeletingNotificationId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta notificação será removida da sua lista. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteNotification.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete All Notifications Dialog */}
        <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todas as notificações?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as notificações serão removidas da sua lista. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAllNotifications.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Limpar todas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Notificacoes;
