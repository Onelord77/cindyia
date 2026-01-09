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
import { Separator } from '@/components/ui/separator';
import { 
  Search, Plus, Building2, MoreVertical, Eye, Edit, Power, Trash2, 
  Users, Calendar, Filter, DollarSign, TrendingUp, Phone, Mail, MapPin 
} from 'lucide-react';
import { cn, formatCurrency, formatPhone } from '@/lib/utils';
import { useAppStore } from '@/hooks/useAppStore';
import { Tenant } from '@/types';
import { toast } from 'sonner';

const planConfig = {
  basic: { label: 'Básico', class: 'bg-muted text-muted-foreground', maxEmployees: 3 },
  pro: { label: 'Pro', class: 'bg-primary/10 text-primary', maxEmployees: 10 },
  enterprise: { label: 'Enterprise', class: 'bg-success/10 text-success', maxEmployees: 50 },
};

const SuperAdminEmpresas = () => {
  const { tenants, addTenant, updateTenant, deleteTenant, toggleTenantStatus } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    plan: 'basic' as Tenant['plan'],
    email: '',
    phone: '',
    address: '',
    cnpj: '',
    maxEmployees: 3,
  });

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.cnpj?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const totalAppointments = tenants.reduce((acc, t) => acc + t.appointmentCount, 0);
  const totalEmployees = tenants.reduce((acc, t) => acc + t.employeeCount, 0);
  const totalRevenue = tenants.reduce((acc, t) => acc + (t.revenue || 0), 0);

  const resetForm = () => {
    setFormData({ name: '', plan: 'basic', email: '', phone: '', address: '', cnpj: '', maxEmployees: 3 });
    setEditingTenant(null);
  };

  const openNewDialog = () => { resetForm(); setIsDialogOpen(true); };
  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({ 
      name: tenant.name, 
      plan: tenant.plan, 
      email: tenant.email || '', 
      phone: tenant.phone || '',
      address: tenant.address || '',
      cnpj: tenant.cnpj || '',
      maxEmployees: tenant.maxEmployees || planConfig[tenant.plan].maxEmployees,
    });
    setIsDialogOpen(true);
  };
  const openViewDialog = (tenant: Tenant) => { setViewingTenant(tenant); setIsViewDialogOpen(true); };
  const openDeleteDialog = (id: string) => { setDeletingTenantId(id); setIsDeleteDialogOpen(true); };

  const handleSave = () => {
    if (!formData.name) { toast.error('Nome é obrigatório'); return; }
    if (editingTenant) {
      updateTenant(editingTenant.id, { 
        name: formData.name, 
        plan: formData.plan,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        cnpj: formData.cnpj,
        maxEmployees: formData.maxEmployees,
      });
      toast.success('Empresa atualizada!');
    } else {
      const newTenant: Tenant = {
        id: Date.now().toString(), 
        name: formData.name, 
        status: 'active', 
        plan: formData.plan,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        cnpj: formData.cnpj,
        createdAt: new Date(), 
        employeeCount: 0, 
        maxEmployees: formData.maxEmployees,
        appointmentCount: 0,
        revenue: 0,
      };
      addTenant(newTenant);
      toast.success('Empresa criada!');
    }
    setIsDialogOpen(false); 
    resetForm();
  };

  const handleToggleStatus = (id: string) => {
    toggleTenantStatus(id);
    toast.success('Status atualizado!');
  };

  const handleDelete = () => {
    if (deletingTenantId) {
      deleteTenant(deletingTenantId);
      toast.success('Empresa excluída!');
      setDeletingTenantId(null); 
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePlanChange = (plan: Tenant['plan']) => {
    setFormData(p => ({ 
      ...p, 
      plan, 
      maxEmployees: planConfig[plan].maxEmployees 
    }));
  };

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
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {[
            { icon: Building2, label: 'Total', value: tenants.length, color: 'primary' },
            { icon: Power, label: 'Ativas', value: activeTenants, color: 'success' },
            { icon: Users, label: 'Funcionários', value: totalEmployees, color: 'warning' },
            { icon: Calendar, label: 'Agendamentos', value: totalAppointments, color: 'info' },
            { icon: DollarSign, label: 'Receita Total', value: formatCurrency(totalRevenue), color: 'success' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-full bg-${color}/10 p-2`}>
                  <Icon className={`h-5 w-5 text-${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
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
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full sm:w-[140px] min-h-[44px]">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Planos</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
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
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Funcionários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Receita</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      <TableCell>
                        <Badge variant="secondary" className={cn(planConfig[tenant.plan].class, 'text-xs')}>
                          {planConfig[tenant.plan].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-medium',
                          tenant.employeeCount >= (tenant.maxEmployees || planConfig[tenant.plan].maxEmployees)
                            ? 'text-destructive'
                            : 'text-foreground'
                        )}>
                          {tenant.employeeCount}
                        </span>
                        <span className="text-muted-foreground">
                          /{tenant.maxEmployees || planConfig[tenant.plan].maxEmployees}
                        </span>
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
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-medium text-success">
                          {formatCurrency(tenant.revenue || 0)}
                        </span>
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
                            <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                              <Edit className="mr-2 h-4 w-4" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(tenant.id)}>
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
            
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="limits">Limites</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4 mt-4">
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
                    placeholder="Rua, número, bairro - cidade/UF"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="limits" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select 
                    value={formData.plan} 
                    onValueChange={(v: Tenant['plan']) => handlePlanChange(v)}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico (até 3 funcionários)</SelectItem>
                      <SelectItem value="pro">Pro (até 10 funcionários)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (até 50 funcionários)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Limite Máximo de Funcionários</Label>
                  <Input 
                    type="number"
                    min={1}
                    max={100}
                    value={formData.maxEmployees} 
                    onChange={(e) => setFormData(p => ({ ...p, maxEmployees: parseInt(e.target.value) || 1 }))} 
                    className="min-h-[44px] w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite padrão para o plano {planConfig[formData.plan].label}: {planConfig[formData.plan].maxEmployees} funcionários
                  </p>
                </div>
                
                <Separator />
                
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">Resumo do Plano</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Plano: <span className="font-medium text-foreground">{planConfig[formData.plan].label}</span></li>
                    <li>• Limite de funcionários: <span className="font-medium text-foreground">{formData.maxEmployees}</span></li>
                    <li>• Agendamentos ilimitados</li>
                    <li>• Suporte {formData.plan === 'enterprise' ? 'prioritário' : 'padrão'}</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingTenant ? 'Salvar Alterações' : 'Criar Empresa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Empresa</DialogTitle>
            </DialogHeader>
            
            {viewingTenant && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{viewingTenant.name}</h3>
                    {viewingTenant.cnpj && (
                      <p className="text-sm text-muted-foreground">CNPJ: {viewingTenant.cnpj}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className={cn(planConfig[viewingTenant.plan].class)}>
                        {planConfig[viewingTenant.plan].label}
                      </Badge>
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
                </div>
                
                <Separator />
                
                {/* Contact Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Contato
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Email:</span> {viewingTenant.email || 'Não informado'}</p>
                      <p><span className="text-muted-foreground">Telefone:</span> {viewingTenant.phone ? formatPhone(viewingTenant.phone) : 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Endereço
                    </h4>
                    <p className="text-sm">{viewingTenant.address || 'Não informado'}</p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Stats */}
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-bold">{viewingTenant.employeeCount}</p>
                      <p className="text-xs text-muted-foreground">de {viewingTenant.maxEmployees || planConfig[viewingTenant.plan].maxEmployees} funcionários</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Calendar className="h-5 w-5 mx-auto mb-1 text-info" />
                      <p className="text-2xl font-bold">{viewingTenant.appointmentCount}</p>
                      <p className="text-xs text-muted-foreground">agendamentos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-5 w-5 mx-auto mb-1 text-success" />
                      <p className="text-2xl font-bold">{formatCurrency(viewingTenant.revenue || 0)}</p>
                      <p className="text-xs text-muted-foreground">receita total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1 text-warning" />
                      <p className="text-2xl font-bold">{new Date(viewingTenant.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">cadastro</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => { 
                setIsViewDialogOpen(false); 
                if (viewingTenant) openEditDialog(viewingTenant); 
              }}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente e não pode ser desfeita. Todos os dados da empresa serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
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
