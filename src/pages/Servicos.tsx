import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Search, Edit, Trash2, Sparkles, Clock, DollarSign, MoreVertical, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';
import { toast } from 'sonner';

const Servicos = () => {
  const isMobile = useIsMobile();
  const { profile, isSuperAdmin } = useAuth();
  const { tenants } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(profile?.tenant_id || undefined);

  const { services, isLoading, addService, updateService, deleteService } = useServices(selectedTenantId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<typeof services[0] | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    tenant_id: '',
  });

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgPrice = services.length > 0 
    ? services.reduce((acc, s) => acc + Number(s.price), 0) / services.length 
    : 0;
  
  const avgDuration = services.length > 0 
    ? Math.round(services.reduce((acc, s) => acc + s.duration, 0) / services.length)
    : 0;

  const resetForm = () => {
    setFormData({ name: '', description: '', duration: '', price: '', tenant_id: selectedTenantId || '' });
    setEditingService(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: typeof services[0]) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: String(service.price),
      tenant_id: service.tenant_id,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.duration || !formData.price) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Super admin without profile tenant needs to select a tenant
    if (isSuperAdmin && !profile?.tenant_id && !formData.tenant_id && !editingService) {
      toast.error('Selecione uma empresa para cadastrar o serviço');
      return;
    }

    if (editingService) {
      await updateService.mutateAsync({
        id: editingService.id,
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
      });
    } else {
      await addService.mutateAsync({
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        tenant_id: formData.tenant_id || undefined,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = async (service: typeof services[0]) => {
    await updateService.mutateAsync({
      id: service.id,
      is_active: !service.is_active,
    });
    toast.success('Status do serviço atualizado');
  };

  const handleDelete = async () => {
    if (deletingServiceId) {
      await deleteService.mutateAsync(deletingServiceId);
      setDeletingServiceId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (serviceId: string) => {
    setDeletingServiceId(serviceId);
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
            <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
            <p className="text-muted-foreground">Gerencie os serviços oferecidos pelo seu salão</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tenant selector for super admins */}
            {isSuperAdmin && tenants.length > 0 && (
              <Select value={selectedTenantId || ''} onValueChange={(value) => setSelectedTenantId(value || undefined)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione empresa" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              Novo Serviço
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-primary/10 p-2 sm:p-3">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total de Serviços</p>
                <p className="text-xl sm:text-2xl font-bold">{services.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-success/10 p-2 sm:p-3">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Ticket Médio</p>
                <p className="text-xl sm:text-2xl font-bold">R$ {avgPrice.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4 sm:p-6">
              <div className="rounded-full bg-warning/10 p-2 sm:p-3">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Duração Média</p>
                <p className="text-xl sm:text-2xl font-bold">{avgDuration} min</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service List */}
        {isMobile ? (
          /* Mobile: Cards */
          <div className="space-y-3">
            {filteredServices.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum serviço encontrado
              </Card>
            ) : (
              filteredServices.map((service) => (
                <MobileCard
                  key={service.id}
                  title={service.name}
                  subtitle={service.description || undefined}
                  avatar={
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  }
                  badge={
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  }
                  fields={[
                    { label: 'Duração', value: `${service.duration} min` },
                    { label: 'Preço', value: `R$ ${Number(service.price).toFixed(2)}` },
                  ]}
                  actions={
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Switch
                          checked={service.is_active || false}
                          onCheckedChange={() => handleToggleActive(service)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {service.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={() => openEditDialog(service)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="min-h-[44px]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDeleteDialog(service.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  }
                />
              ))
            )}
          </div>
        ) : (
          /* Desktop: Table */
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum serviço encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow key={service.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{service.name}</p>
                              {service.description && (
                                <p className="text-sm text-muted-foreground">{service.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {service.duration} min
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">R$ {Number(service.price).toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={service.is_active || false}
                              onCheckedChange={() => handleToggleActive(service)}
                            />
                            <Badge variant={service.is_active ? 'default' : 'secondary'}>
                              {service.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="sm:opacity-0 sm:group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(service)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(service.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
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
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
              <DialogDescription>
                {editingService ? 'Atualize as informações do serviço' : 'Adicione um novo serviço ao catálogo'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Tenant selector for super admins when creating */}
              {isSuperAdmin && !editingService && !profile?.tenant_id && (
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select 
                    value={formData.tenant_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tenant_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Serviço *</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Corte Feminino"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Descrição do serviço..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos) *</Label>
                  <Input 
                    id="duration" 
                    type="number" 
                    placeholder="45"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01" 
                    placeholder="80.00"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={addService.isPending || updateService.isPending}>
                {(addService.isPending || updateService.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O serviço será removido permanentemente.
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

export default Servicos;
