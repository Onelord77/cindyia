import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, Plus, Building2, MoreVertical, Eye, Edit, Power, Trash2, Users, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/hooks/useAppStore';
import { Tenant } from '@/types';
import { toast } from 'sonner';

const planConfig = {
  basic: { label: 'Básico', class: 'bg-muted text-muted-foreground' },
  pro: { label: 'Pro', class: 'bg-primary/10 text-primary' },
  enterprise: { label: 'Enterprise', class: 'bg-success/10 text-success' },
};

const SuperAdminEmpresas = () => {
  const { tenants, addTenant, updateTenant, deleteTenant, toggleTenantStatus } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', plan: 'basic' as Tenant['plan'], email: '' });

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const totalAppointments = tenants.reduce((acc, t) => acc + t.appointmentCount, 0);
  const totalEmployees = tenants.reduce((acc, t) => acc + t.employeeCount, 0);

  const resetForm = () => {
    setFormData({ name: '', plan: 'basic', email: '' });
    setEditingTenant(null);
  };

  const openNewDialog = () => { resetForm(); setIsDialogOpen(true); };
  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({ name: tenant.name, plan: tenant.plan, email: '' });
    setIsDialogOpen(true);
  };
  const openViewDialog = (tenant: Tenant) => { setViewingTenant(tenant); setIsViewDialogOpen(true); };
  const openDeleteDialog = (id: string) => { setDeletingTenantId(id); setIsDeleteDialogOpen(true); };

  const handleSave = () => {
    if (!formData.name) { toast.error('Nome é obrigatório'); return; }
    if (editingTenant) {
      updateTenant(editingTenant.id, { name: formData.name, plan: formData.plan });
      toast.success('Empresa atualizada!');
    } else {
      const newTenant: Tenant = {
        id: Date.now().toString(), name: formData.name, status: 'active', plan: formData.plan,
        createdAt: new Date(), employeeCount: 0, appointmentCount: 0,
      };
      addTenant(newTenant);
      toast.success('Empresa criada!');
    }
    setIsDialogOpen(false); resetForm();
  };

  const handleToggleStatus = (id: string) => {
    toggleTenantStatus(id);
    toast.success('Status atualizado!');
  };

  const handleDelete = () => {
    if (deletingTenantId) {
      deleteTenant(deletingTenantId);
      toast.success('Empresa excluída!');
      setDeletingTenantId(null); setIsDeleteDialogOpen(false);
    }
  };

  return (
    <MainLayout isSuperAdmin>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Gerenciar Empresas</h1>
            <p className="text-sm text-muted-foreground">Painel de administração de tenants</p>
          </div>
          <Button className="gap-2 min-h-[44px] w-full sm:w-auto sm:self-end" onClick={openNewDialog}>
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { icon: Building2, label: 'Total', value: tenants.length, color: 'primary' },
            { icon: Power, label: 'Ativas', value: activeTenants, color: 'success' },
            { icon: Users, label: 'Funcionários', value: totalEmployees, color: 'warning' },
            { icon: Calendar, label: 'Agendamentos', value: totalAppointments, color: 'info' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-full bg-${color}/10 p-2`}><Icon className={`h-5 w-5 text-${color}`} /></div>
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 min-h-[44px]" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Funcionários</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="group">
                    <TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="font-medium text-sm">{tenant.name}</span></div></TableCell>
                    <TableCell><Badge variant="secondary" className={cn(planConfig[tenant.plan].class, 'text-xs')}>{planConfig[tenant.plan].label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={cn(tenant.status === 'active' ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive', 'text-xs')}>{tenant.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{tenant.employeeCount}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(tenant)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(tenant)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(tenant.id)}><Power className="mr-2 h-4 w-4" />{tenant.status === 'active' ? 'Desativar' : 'Ativar'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(tenant.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{editingTenant ? 'Editar' : 'Nova'} Empresa</DialogTitle><DialogDescription>{editingTenant ? 'Atualize' : 'Cadastre'} os dados</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="min-h-[44px]" /></div>
              <div className="space-y-2"><Label>Plano</Label><Select value={formData.plan} onValueChange={(v: Tenant['plan']) => setFormData(p => ({ ...p, plan: v }))}><SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basic">Básico</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Detalhes da Empresa</DialogTitle></DialogHeader>
            {viewingTenant && <div className="grid grid-cols-2 gap-4 py-4">{[['Nome', viewingTenant.name], ['Plano', planConfig[viewingTenant.plan].label], ['Status', viewingTenant.status === 'active' ? 'Ativo' : 'Inativo'], ['Funcionários', viewingTenant.employeeCount], ['Agendamentos', viewingTenant.appointmentCount], ['Criação', new Date(viewingTenant.createdAt).toLocaleDateString('pt-BR')]].map(([l, v]) => <div key={l as string}><p className="text-sm text-muted-foreground">{l}</p><p className="font-medium">{v}</p></div>)}</div>}
            <DialogFooter><Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir empresa?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default SuperAdminEmpresas;
