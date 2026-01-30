import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MobileCard } from '@/components/ui/mobile-card';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Phone, Mail, Calendar, MoreVertical, Edit, Trash2, User, Users, UserCheck, Loader2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useClients, type ClientStatusFilter } from '@/hooks/useClients';
import { phoneToWhatsAppLink, formatPhone, formatPhoneMask, unmaskPhone, extractNationalNumber, extractDDI } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const Clientes = () => {
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>('all');
  const { clients, isLoading, addClient, updateClient, deleteClient } = useClients(statusFilter);
  const { clients: allClients = [] } = useClients('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<typeof clients[0] | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ddi: '55',
    phone: '',
    email: '',
    notes: '',
  });

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const name = client.name || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone && client.phone.includes(searchTerm));
    });
  }, [clients, searchTerm]);

  const totalClients = useMemo(() => allClients.filter(c => !c.is_lead).length, [allClients]);
  const totalLeads = useMemo(() => allClients.filter(c => c.is_lead).length, [allClients]);

  const activeThisMonth = useMemo(() => {
    const now = new Date();
    return allClients.filter(c => {
      if (!c.last_visit) return false;
      const lastVisit = new Date(c.last_visit);
      return lastVisit.getMonth() === now.getMonth() && lastVisit.getFullYear() === now.getFullYear();
    }).length;
  }, [allClients]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return allClients.filter(c => {
      const createdAt = new Date(c.created_at || '');
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length;
  }, [allClients]);

  const resetForm = () => {
    setFormData({ name: '', ddi: '55', phone: '', email: '', notes: '' });
    setEditingClient(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: typeof clients[0]) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      ddi: client.phone ? extractDDI(client.phone) : '55',
      phone: client.phone ? formatPhoneMask(extractNationalNumber(client.phone)) : '',
      email: client.email || '',
      notes: client.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    // Remove mask from phone and add DDI before saving
    const phoneWithDDI = unmaskPhone(formData.phone, formData.ddi);

    if (editingClient) {
      await updateClient.mutateAsync({
        id: editingClient.id,
        name: formData.name,
        phone: phoneWithDDI,
        email: formData.email || null,
        notes: formData.notes || null,
      });
    } else {
      await addClient.mutateAsync({
        name: formData.name,
        phone: phoneWithDDI,
        email: formData.email || null,
        notes: formData.notes || null,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingClientId) {
      await deleteClient.mutateAsync(deletingClientId);
      setDeletingClientId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (clientId: string) => {
    setDeletingClientId(clientId);
    setIsDeleteDialogOpen(true);
  };

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gerencie sua base de clientes e leads</p>
          </div>

          <Button className="gap-2" onClick={openNewDialog}>
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClientStatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="lead">Leads</TabsTrigger>
            <TabsTrigger value="client">Clientes</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-primary/10 p-2 sm:p-3 hidden sm:flex">
                <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Clientes</p>
                <p className="text-xl sm:text-2xl font-bold">{totalClients}</p>
              </div>
              <UserCheck className="h-5 w-5 text-primary/30 sm:hidden flex-shrink-0" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-yellow-500/10 p-2 sm:p-3 hidden sm:flex">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Leads</p>
                <p className="text-xl sm:text-2xl font-bold">{totalLeads}</p>
              </div>
              <Users className="h-5 w-5 text-yellow-600/30 sm:hidden flex-shrink-0" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-success/10 p-2 sm:p-3 hidden sm:flex">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Ativos este mês</p>
                <p className="text-xl sm:text-2xl font-bold">{activeThisMonth}</p>
              </div>
              <Calendar className="h-5 w-5 text-success/30 sm:hidden flex-shrink-0" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-warning/10 p-2 sm:p-3 hidden sm:flex">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Novos este mês</p>
                <p className="text-xl sm:text-2xl font-bold">{newThisMonth}</p>
              </div>
              <User className="h-5 w-5 text-warning/30 sm:hidden flex-shrink-0" />
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        {isMobile ? (
          /* Mobile: Cards */
          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum cliente encontrado
              </Card>
            ) : (
              filteredClients.map((client) => {
                const displayName = client.name || (client.phone ? formatPhone(client.phone) : 'Sem nome');
                const initials = client.name
                  ? client.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                  : (client.phone ? client.phone.slice(-2) : '??');

                return (
                  <MobileCard
                    key={client.id}
                    title={displayName}
                    subtitle={`${client.is_lead ? 'Lead' : 'Cliente'} desde ${new Date(client.created_at || '').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
                    avatar={
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={client.is_lead
                          ? "bg-yellow-100 text-yellow-700 font-semibold"
                          : "bg-primary/10 text-primary font-semibold"
                        }>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    }
                    badge={
                      <Badge
                        variant={client.is_lead ? 'outline' : 'secondary'}
                        className={client.is_lead
                          ? 'border-yellow-500 text-yellow-700 text-xs'
                          : 'text-xs'
                        }
                      >
                        {client.is_lead ? 'Lead' : 'Cliente'}
                      </Badge>
                    }
                    fields={[
                      { label: 'Telefone', value: client.phone ? formatPhone(client.phone) : '-' },
                      { label: 'Última Visita', value: client.last_visit ? new Date(client.last_visit).toLocaleDateString('pt-BR') : '-' },
                    ]}
                    actions={
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-h-[44px]"
                          onClick={() => openEditDialog(client)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        {client.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[44px]"
                            asChild
                          >
                            <a
                              href={phoneToWhatsAppLink(client.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <WhatsAppIcon className="h-4 w-4 text-green-600" />
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="min-h-[44px]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {client.is_lead && (
                              <DropdownMenuItem onClick={() => updateClient.mutate({ id: client.id, is_lead: false })}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Converter para Cliente
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openDeleteDialog(client.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    }
                  />
                );
              })
            )}
          </div>
        ) : (
          /* Desktop: Table */
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => {
                      const displayName = client.name || (client.phone ? formatPhone(client.phone) : 'Sem nome');
                      const initials = client.name
                        ? client.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                        : (client.phone ? client.phone.slice(-2) : '??');

                      return (
                        <TableRow key={client.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={client.is_lead
                                  ? "bg-yellow-100 text-yellow-700 font-semibold"
                                  : "bg-primary/10 text-primary font-semibold"
                                }>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{displayName}</p>
                                  <Badge
                                    variant={client.is_lead ? 'outline' : 'secondary'}
                                    className={client.is_lead
                                      ? 'border-yellow-500 text-yellow-700 text-xs'
                                      : 'text-xs'
                                    }
                                  >
                                    {client.is_lead ? 'Lead' : 'Cliente'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {client.is_lead ? 'Lead' : 'Cliente'} desde {new Date(client.created_at || '').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {client.phone ? formatPhone(client.phone) : '-'}
                                {client.phone && (
                                  <a
                                    href={phoneToWhatsAppLink(client.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-700"
                                    title="Abrir WhatsApp"
                                  >
                                    <WhatsAppIcon className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                              {client.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  {client.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.last_visit ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(client.last_visit).toLocaleDateString('pt-BR')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="sm:opacity-0 sm:group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {client.is_lead && (
                                  <DropdownMenuItem onClick={() => updateClient.mutate({ id: client.id, is_lead: false })}>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Converter para Cliente
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openEditDialog(client)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(client.id)}
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
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Atualize as informações do cliente' : 'Adicione um novo cliente ao sistema'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input 
                  id="name" 
                  placeholder="Nome do cliente"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.ddi}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ddi: value }))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="DDI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="55">+55</SelectItem>
                      <SelectItem value="1">+1</SelectItem>
                      <SelectItem value="351">+351</SelectItem>
                      <SelectItem value="34">+34</SelectItem>
                      <SelectItem value="33">+33</SelectItem>
                      <SelectItem value="44">+44</SelectItem>
                      <SelectItem value="49">+49</SelectItem>
                      <SelectItem value="39">+39</SelectItem>
                      <SelectItem value="81">+81</SelectItem>
                      <SelectItem value="86">+86</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    placeholder="(85) 99766-7750"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneMask(e.target.value) }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Observações sobre o cliente..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={addClient.isPending || updateClient.isPending}>
                {(addClient.isPending || updateClient.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O cliente será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Clientes;
