import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Plus, Bell, MoreVertical, Edit, Power, Trash2,
  Loader2, Info, AlertTriangle, CheckCircle, XCircle, Building2, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminNotifications, NotificationWithTargets, NotificationType, TargetType } from '@/hooks/useAdminNotifications';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCard } from '@/components/dashboard/StatsCard';

const typeConfig: Record<NotificationType, { label: string; icon: React.ElementType; class: string }> = {
  info: { label: 'Informação', icon: Info, class: 'bg-blue-500/10 text-blue-500' },
  warning: { label: 'Aviso', icon: AlertTriangle, class: 'bg-amber-500/10 text-amber-500' },
  success: { label: 'Sucesso', icon: CheckCircle, class: 'bg-green-500/10 text-green-500' },
  error: { label: 'Erro', icon: XCircle, class: 'bg-red-500/10 text-red-500' },
};

const AdminNotificacoes = () => {
  const {
    notifications,
    tenants,
    isLoading,
    createNotification,
    updateNotification,
    deleteNotification,
    toggleNotificationStatus
  } = useAdminNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<NotificationWithTargets | null>(null);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as NotificationType,
    target_type: 'all' as TargetType,
    target_tenant_ids: [] as string[],
    expires_at: '',
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            notification.message.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'active') return matchesSearch && notification.is_active;
      if (statusFilter === 'inactive') return matchesSearch && !notification.is_active;
      if (statusFilter === 'expired') {
        return matchesSearch && notification.expires_at && !isAfter(parseISO(notification.expires_at), new Date());
      }
      return matchesSearch;
    });
  }, [notifications, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: notifications.length,
      active: notifications.filter(n => n.is_active).length,
      expired: notifications.filter(n => n.expires_at && !isAfter(parseISO(n.expires_at), now)).length,
      thisMonth: notifications.filter(n => n.created_at && isAfter(parseISO(n.created_at), thisMonth)).length,
    };
  }, [notifications]);

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      target_type: 'all',
      target_tenant_ids: [],
      expires_at: '',
    });
    setEditingNotification(null);
  };

  const openNewDialog = () => { resetForm(); setIsDialogOpen(true); };

  const openEditDialog = (notification: NotificationWithTargets) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      type: notification.type as NotificationType,
      target_type: notification.target_type as TargetType,
      target_tenant_ids: notification.targets?.map(t => t.tenant_id) || [],
      expires_at: notification.expires_at ? notification.expires_at.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingNotificationId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      return;
    }
    if (!formData.message.trim()) {
      return;
    }
    if (formData.target_type === 'specific' && formData.target_tenant_ids.length === 0) {
      return;
    }

    const payload = {
      title: formData.title,
      message: formData.message,
      type: formData.type,
      target_type: formData.target_type,
      target_tenant_ids: formData.target_type === 'specific' ? formData.target_tenant_ids : undefined,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
    };

    if (editingNotification) {
      await updateNotification.mutateAsync({
        id: editingNotification.id,
        ...payload,
        is_active: editingNotification.is_active ?? true,
      });
    } else {
      await createNotification.mutateAsync(payload);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingNotificationId) {
      await deleteNotification.mutateAsync(deletingNotificationId);
      setIsDeleteDialogOpen(false);
      setDeletingNotificationId(null);
    }
  };

  const handleToggleStatus = async (notification: NotificationWithTargets) => {
    await toggleNotificationStatus.mutateAsync({
      id: notification.id,
      is_active: !notification.is_active,
    });
  };

  const toggleTenantSelection = (tenantId: string) => {
    setFormData(prev => ({
      ...prev,
      target_tenant_ids: prev.target_tenant_ids.includes(tenantId)
        ? prev.target_tenant_ids.filter(id => id !== tenantId)
        : [...prev.target_tenant_ids, tenantId]
    }));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notificações do Sistema</h1>
            <p className="text-sm text-muted-foreground">Gerencie notificações enviadas para os tenants</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Notificação
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatsCard title="Total" value={stats.total} icon={<Bell className="h-5 w-5" />} />
          <StatsCard title="Ativas" value={stats.active} icon={<CheckCircle className="h-5 w-5" />} />
          <StatsCard title="Expiradas" value={stats.expired} icon={<Calendar className="h-5 w-5" />} />
          <StatsCard title="Este Mês" value={stats.thisMonth} icon={<Bell className="h-5 w-5" />} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar notificações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações ({filteredNotifications.length})</CardTitle>
            <CardDescription>Lista de todas as notificações do sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma notificação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => {
                    const typeInfo = typeConfig[notification.type as NotificationType] || typeConfig.info;
                    const TypeIcon = typeInfo.icon;
                    const isExpired = notification.expires_at && !isAfter(parseISO(notification.expires_at), new Date());

                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className={cn('inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium', typeInfo.class)}>
                            <TypeIcon className="h-3.5 w-3.5" />
                            {typeInfo.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{notification.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {notification.target_type === 'all' ? (
                            <Badge variant="outline">Todos os tenants</Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {notification.targets?.slice(0, 2).map(t => (
                                <Badge key={t.tenant_id} variant="secondary" className="text-xs">
                                  {t.tenant_name}
                                </Badge>
                              ))}
                              {(notification.targets?.length || 0) > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{(notification.targets?.length || 0) - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="outline" className="bg-muted">Expirada</Badge>
                          ) : notification.is_active ? (
                            <Badge className="bg-success/10 text-success">Ativa</Badge>
                          ) : (
                            <Badge variant="outline">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {notification.expires_at ? (
                            <span className={cn(isExpired && 'text-muted-foreground line-through')}>
                              {format(parseISO(notification.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {notification.created_at && format(parseISO(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(notification)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(notification)}>
                                <Power className="mr-2 h-4 w-4" />
                                {notification.is_active ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(notification.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingNotification ? 'Editar Notificação' : 'Nova Notificação'}</DialogTitle>
              <DialogDescription>
                {editingNotification
                  ? 'Edite os dados da notificação'
                  : 'Preencha os dados para criar uma nova notificação'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título da notificação"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Mensagem da notificação"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: NotificationType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value: TargetType) => setFormData({ ...formData, target_type: value, target_tenant_ids: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tenants</SelectItem>
                      <SelectItem value="specific">Tenants específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.target_type === 'specific' && (
                <div className="space-y-2">
                  <Label>Selecione os tenants *</Label>
                  <ScrollArea className="h-[150px] border rounded-md p-3">
                    <div className="space-y-2">
                      {tenants.map((tenant) => (
                        <div key={tenant.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={tenant.id}
                            checked={formData.target_tenant_ids.includes(tenant.id)}
                            onCheckedChange={() => toggleTenantSelection(tenant.id)}
                          />
                          <label
                            htmlFor={tenant.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {tenant.name}
                          </label>
                        </div>
                      ))}
                      {tenants.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum tenant disponível</p>
                      )}
                    </div>
                  </ScrollArea>
                  {formData.target_tenant_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formData.target_tenant_ids.length} tenant(s) selecionado(s)
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expires_at">Data de expiração (opcional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={createNotification.isPending || updateNotification.isPending}
              >
                {(createNotification.isPending || updateNotification.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingNotification ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A notificação será removida permanentemente
                e não será mais exibida para nenhum usuário.
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
      </div>
    </AdminLayout>
  );
};

export default AdminNotificacoes;
