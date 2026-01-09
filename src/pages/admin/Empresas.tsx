import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Plus, Building2, MoreVertical, Eye, Edit, Power, Trash2, 
  Users, Calendar, Filter, DollarSign, Phone, Mail, Loader2, UserPlus, Shield 
} from 'lucide-react';
import { cn, formatCurrency, formatPhone } from '@/lib/utils';
import { useTenants } from '@/hooks/useTenants';
import { useUserManagement, useTenantAdmins } from '@/hooks/useUserManagement';
import { toast } from 'sonner';

const planConfig = {
  basic: { label: 'Básico', class: 'bg-muted text-muted-foreground', maxEmployees: 3 },
  pro: { label: 'Pro', class: 'bg-primary/10 text-primary', maxEmployees: 10 },
  enterprise: { label: 'Enterprise', class: 'bg-success/10 text-success', maxEmployees: 50 },
};

const SuperAdminEmpresas = () => {
  const { tenants, isLoading, addTenant, updateTenant, deleteTenant } = useTenants();
  const { createUser, deleteUser } = useUserManagement();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isCreateAdminDialogOpen, setIsCreateAdminDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<typeof tenants[0] | null>(null);
  const [viewingTenant, setViewingTenant] = useState<typeof tenants[0] | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [managingTenant, setManagingTenant] = useState<typeof tenants[0] | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);

  const { data: tenantAdmins = [], isLoading: isLoadingAdmins } = useTenantAdmins(managingTenant?.id || null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cnpj: '',
    maxEmployees: 3,
  });

  const [adminFormData, setAdminFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.cnpj?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTenants = tenants.filter((t) => t.status === 'active').length;

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', cnpj: '', maxEmployees: 3 });
    setEditingTenant(null);
  };

  const openNewDialog = () => { resetForm(); setIsDialogOpen(true); };
  
  const openEditDialog = (tenant: typeof tenants[0]) => {
    setEditingTenant(tenant);
    setFormData({ 
      name: tenant.name, 
      email: tenant.email || '', 
      phone: tenant.phone || '',
      address: tenant.address || '',
      cnpj: tenant.cnpj || '',
      maxEmployees: tenant.max_employees || 3,
    });
    setIsDialogOpen(true);
  };
  
  const openViewDialog = (tenant: typeof tenants[0]) => { 
    setViewingTenant(tenant); 
    setIsViewDialogOpen(true); 
  };
  
  const openDeleteDialog = (id: string) => { 
    setDeletingTenantId(id); 
    setIsDeleteDialogOpen(true); 
  };

  const openAdminDialog = (tenant: typeof tenants[0]) => {
    setManagingTenant(tenant);
    setIsAdminDialogOpen(true);
  };

  const resetAdminForm = () => {
    setAdminFormData({ fullName: '', email: '', password: '', phone: '' });
  };

  const handleCreateAdmin = async () => {
    if (!adminFormData.fullName || !adminFormData.password) {
      toast.error('Nome e senha são obrigatórios');
      return;
    }
    if (adminFormData.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (!managingTenant) return;

    await createUser.mutateAsync({
      email: adminFormData.email,
      password: adminFormData.password,
      fullName: adminFormData.fullName,
      tenantId: managingTenant.id,
      role: 'admin',
      phone: adminFormData.phone || undefined,
    });
    
    setIsCreateAdminDialogOpen(false);
    resetAdminForm();
  };

  const handleDeleteAdmin = async () => {
    if (deletingAdminId) {
      await deleteUser.mutateAsync({ userId: deletingAdminId });
      setDeletingAdminId(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name) { 
      toast.error('Nome é obrigatório'); 
      return; 
    }
    
    if (editingTenant) {
      await updateTenant.mutateAsync({
        id: editingTenant.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        cnpj: formData.cnpj || null,
        max_employees: formData.maxEmployees,
      });
    } else {
      await addTenant.mutateAsync({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        cnpj: formData.cnpj || null,
        max_employees: formData.maxEmployees,
      });
    }
    
    setIsDialogOpen(false); 
    resetForm();
  };

  const handleToggleStatus = async (tenant: typeof tenants[0]) => {
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
    await updateTenant.mutateAsync({
      id: tenant.id,
      status: newStatus,
    });
    toast.success('Status atualizado!');
  };

  const handleDelete = async () => {
    if (deletingTenantId) {
      await deleteTenant.mutateAsync(deletingTenantId);
      setDeletingTenantId(null); 
      setIsDeleteDialogOpen(false);
    }
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Gerenciar Empresas</h1>
            <p className="text-sm text-muted-foreground">Painel completo de administração de tenants</p>
          </div>
          <Button className="gap-2 min-h-[44px] w-full sm:w-auto sm:self-end" onClick={openNewDialog}>
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{tenants.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-success/10 p-2">
                <Power className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ativas</p>
                <p className="text-lg font-bold">{activeTenants}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-warning/10 p-2">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inativas</p>
                <p className="text-lg font-bold">{tenants.length - activeTenants}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-info/10 p-2">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Este mês</p>
                <p className="text-lg font-bold">
                  {tenants.filter(t => {
                    const created = new Date(t.created_at || '');
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nome, email ou CNPJ..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10 min-h-[44px]" 
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] min-h-[44px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-center">Limite Funcionários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tenant.name}</p>
                            {tenant.cnpj && (
                              <p className="text-xs text-muted-foreground">{tenant.cnpj}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {tenant.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {tenant.email}
                            </p>
                          )}
                          {tenant.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {formatPhone(tenant.phone)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{tenant.max_employees || 10}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            tenant.status === 'active' 
                              ? 'border-success/30 bg-success/10 text-success' 
                              : 'border-destructive/30 bg-destructive/10 text-destructive',
                            'text-xs'
                          )}
                        >
                          {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(tenant)}>
                              <Eye className="mr-2 h-4 w-4" />Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdminDialog(tenant)}>
                              <Shield className="mr-2 h-4 w-4" />Gerenciar Admins
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                              <Edit className="mr-2 h-4 w-4" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(tenant)}>
                              <Power className="mr-2 h-4 w-4" />
                              {tenant.status === 'active' ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={() => openDeleteDialog(tenant.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Editar' : 'Nova'} Empresa</DialogTitle>
              <DialogDescription>
                {editingTenant ? 'Atualize os dados da empresa' : 'Cadastre uma nova empresa no sistema'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
                    className="min-h-[44px]"
                    placeholder="Nome fantasia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input 
                    value={formData.cnpj} 
                    onChange={(e) => setFormData(p => ({ ...p, cnpj: e.target.value }))} 
                    className="min-h-[44px]"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} 
                    className="min-h-[44px]"
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input 
                    type="tel"
                    value={formData.phone} 
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} 
                    className="min-h-[44px]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} 
                  className="min-h-[44px]"
                  placeholder="Endereço completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Limite de Funcionários</Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.maxEmployees} 
                  onChange={(e) => setFormData(p => ({ ...p, maxEmployees: parseInt(e.target.value) || 3 }))} 
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={addTenant.isPending || updateTenant.isPending} className="min-h-[44px]">
                {(addTenant.isPending || updateTenant.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTenant ? 'Salvar Alterações' : 'Criar Empresa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Empresa</DialogTitle>
            </DialogHeader>
            {viewingTenant && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{viewingTenant.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        viewingTenant.status === 'active' 
                          ? 'border-success/30 bg-success/10 text-success' 
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      )}
                    >
                      {viewingTenant.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  {viewingTenant.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{viewingTenant.email}</p>
                    </div>
                  )}
                  {viewingTenant.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{formatPhone(viewingTenant.phone)}</p>
                    </div>
                  )}
                  {viewingTenant.cnpj && (
                    <div>
                      <p className="text-sm text-muted-foreground">CNPJ</p>
                      <p className="font-medium">{viewingTenant.cnpj}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Limite Funcionários</p>
                    <p className="font-medium">{viewingTenant.max_employees || 10}</p>
                  </div>
                  {viewingTenant.address && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">{viewingTenant.address}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {new Date(viewingTenant.created_at || '').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados da empresa serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Admin Management Dialog */}
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerenciar Administradores</DialogTitle>
              <DialogDescription>
                Administradores de {managingTenant?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  onClick={() => { resetAdminForm(); setIsCreateAdminDialogOpen(true); }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Novo Administrador
                </Button>
              </div>

              {isLoadingAdmins ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : tenantAdmins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum administrador cadastrado para esta empresa
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.full_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {admin.email && (
                              <p className="text-xs flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {admin.email}
                              </p>
                            )}
                            {admin.phone && (
                              <p className="text-xs flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {formatPhone(admin.phone)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingAdminId(admin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Admin Dialog */}
        <Dialog open={isCreateAdminDialogOpen} onOpenChange={setIsCreateAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Administrador</DialogTitle>
              <DialogDescription>
                Criar um novo administrador para {managingTenant?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input 
                  value={adminFormData.fullName} 
                  onChange={(e) => setAdminFormData(p => ({ ...p, fullName: e.target.value }))} 
                  className="min-h-[44px]"
                  placeholder="Nome do administrador"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail (opcional)</Label>
                <Input 
                  type="email"
                  value={adminFormData.email} 
                  onChange={(e) => setAdminFormData(p => ({ ...p, email: e.target.value }))} 
                  className="min-h-[44px]"
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input 
                  type="password"
                  value={adminFormData.password} 
                  onChange={(e) => setAdminFormData(p => ({ ...p, password: e.target.value }))} 
                  className="min-h-[44px]"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  type="tel"
                  value={adminFormData.phone} 
                  onChange={(e) => setAdminFormData(p => ({ ...p, phone: e.target.value }))} 
                  className="min-h-[44px]"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateAdminDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button onClick={handleCreateAdmin} disabled={createUser.isPending} className="min-h-[44px]">
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Administrador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Admin Confirmation */}
        <AlertDialog open={!!deletingAdminId} onOpenChange={(open) => !open && setDeletingAdminId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir administrador?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O administrador perderá acesso ao sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAdmin} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default SuperAdminEmpresas;
