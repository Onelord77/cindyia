import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Search, Edit, Trash2, Sparkles, Clock, DollarSign, MoreVertical, Loader2, FolderOpen, ChevronDown, Palette, Tag, ImageIcon } from 'lucide-react';
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
import { useServices, type ServiceWithCategory } from '@/hooks/useServices';
import { useServiceCategories, type ServiceCategory } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from 'sonner';

// Cores predefinidas para categorias
const CATEGORY_COLORS = [
  { name: 'Roxo', value: '#6366f1' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Cinza', value: '#6b7280' },
];

const Servicos = () => {
  const isMobile = useIsMobile();
  const { profile, isSuperAdmin } = useAuth();
  const { tenants } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(profile?.tenant_id || undefined);

  const { services, isLoading, addService, updateService, deleteService } = useServices(selectedTenantId);
  const { categories, addCategory, updateCategory, deleteCategory } = useServiceCategories(selectedTenantId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['uncategorized']));

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    tenant_id: '',
    category_id: '',
    image_url: '' as string | null,
    requires_quote: false,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: '#6366f1',
  });

  // Filtrar serviços
  const filteredServices = useMemo(() => {
    return services.filter((service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  // Agrupar serviços por categoria
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, ServiceWithCategory[]> = {};

    // Inicializar categorias
    categories.forEach(cat => {
      grouped[cat.id] = [];
    });
    grouped['uncategorized'] = [];

    // Agrupar serviços
    filteredServices.forEach(service => {
      const catId = service.category_id || 'uncategorized';
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(service);
    });

    return grouped;
  }, [filteredServices, categories]);

  const avgPrice = services.length > 0
    ? services.reduce((acc, s) => acc + Number(s.price), 0) / services.length
    : 0;

  const avgDuration = services.length > 0
    ? Math.round(services.reduce((acc, s) => acc + s.duration, 0) / services.length)
    : 0;

  const resetForm = () => {
    setFormData({ name: '', description: '', duration: '', price: '', tenant_id: selectedTenantId || '', category_id: '', image_url: null, requires_quote: false });
    setEditingService(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', color: '#6366f1' });
    setEditingCategory(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: ServiceWithCategory) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: String(service.price),
      tenant_id: service.tenant_id,
      category_id: service.category_id || '',
      image_url: service.image_url || null,
      requires_quote: (service as any).requires_quote === true,
    });
    setIsDialogOpen(true);
  };

  const openNewCategoryDialog = () => {
    resetCategoryForm();
    setIsCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: ServiceCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      color: category.color || '#6366f1',
    });
    setIsCategoryDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.duration || (!formData.requires_quote && !formData.price)) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (isSuperAdmin && !profile?.tenant_id && !formData.tenant_id && !editingService) {
      toast.error('Selecione uma empresa para cadastrar o serviço');
      return;
    }

    const price = formData.requires_quote ? 0 : parseFloat(formData.price);

    if (editingService) {
      await updateService.mutateAsync({
        id: editingService.id,
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        requires_quote: formData.requires_quote,
      } as any);
    } else {
      await addService.mutateAsync({
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price,
        tenant_id: formData.tenant_id || undefined,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        requires_quote: formData.requires_quote,
      } as any);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: categoryFormData.name,
        color: categoryFormData.color,
      });
    } else {
      await addCategory.mutateAsync({
        name: categoryFormData.name,
        color: categoryFormData.color,
      });
    }

    setIsCategoryDialogOpen(false);
    resetCategoryForm();
  };

  const handleToggleActive = async (service: ServiceWithCategory) => {
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

  const handleDeleteCategory = async () => {
    if (deletingCategoryId) {
      await deleteCategory.mutateAsync(deletingCategoryId);
      setDeletingCategoryId(null);
      setIsDeleteCategoryDialogOpen(false);
    }
  };

  const openDeleteDialog = (serviceId: string) => {
    setDeletingServiceId(serviceId);
    setIsDeleteDialogOpen(true);
  };

  const openDeleteCategoryDialog = (categoryId: string) => {
    setDeletingCategoryId(categoryId);
    setIsDeleteCategoryDialogOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const renderServiceRow = (service: ServiceWithCategory) => {
    const imageUrl = service.image_url;
    return (
    <TableRow key={service.id} className="group">
      <TableCell className="w-[88px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={service.name}
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-border shadow-sm"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground"
            title="Sem foto cadastrada"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-[9px] font-medium uppercase tracking-wide">Sem foto</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{service.name}</p>
          {service.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {service.duration} min
        </div>
      </TableCell>
      <TableCell>
        {(service as any).requires_quote ? (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs whitespace-nowrap">Preço a consultar</Badge>
        ) : (
          <span className="font-semibold">R$ {Number(service.price).toFixed(2)}</span>
        )}
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
    );
  };

  const renderServiceCard = (service: ServiceWithCategory) => {
    const imageUrl = service.image_url;
    return (
    <MobileCard
      key={service.id}
      title={service.name}
      subtitle={service.description || undefined}
      avatar={
        imageUrl ? (
          <img
            src={imageUrl}
            alt={service.name}
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-border shadow-sm"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground"
            title="Sem foto cadastrada"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-[9px] font-medium uppercase tracking-wide">Sem foto</span>
          </div>
        )
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
    );
  };

  const renderCategorySection = (categoryId: string, categoryServices: ServiceWithCategory[]) => {
    const category = getCategoryById(categoryId);
    const isUncategorized = categoryId === 'uncategorized';
    const isExpanded = expandedCategories.has(categoryId);
    const categoryColor = category?.color || '#6b7280';

    if (categoryServices.length === 0 && isUncategorized) return null;

    return (
      <Collapsible
        key={categoryId}
        open={isExpanded}
        onOpenChange={() => toggleCategory(categoryId)}
      >
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: isUncategorized ? '#6b7280' : categoryColor }}
                  />
                  <CardTitle className="text-base font-medium">
                    {isUncategorized ? 'Sem Categoria' : category?.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {categoryServices.length} {categoryServices.length === 1 ? 'serviço' : 'serviços'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!isUncategorized && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditCategoryDialog(category!); }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); openDeleteCategoryDialog(categoryId); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-0 border-t">
              {categoryServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum serviço nesta categoria
                </p>
              ) : isMobile ? (
                <div className="p-3 space-y-3">
                  {categoryServices.map(renderServiceCard)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[88px]">Foto</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryServices.map(renderServiceRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
            <p className="text-muted-foreground">Gerencie os serviços oferecidos pelo seu salão</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && tenants.length > 0 && (
              <Select value={selectedTenantId || ''} onValueChange={(value) => setSelectedTenantId(value || undefined)}>
                <SelectTrigger className="w-[180px]">
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
            <Button variant="outline" className="gap-2" onClick={openNewCategoryDialog}>
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Categoria</span>
            </Button>
            <Button className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Serviço</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">Serviços</p>
                <p className="text-xl font-bold">{services.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-secondary/50 p-2">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">Categorias</p>
                <p className="text-xl font-bold">{categories.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-success/10 p-2">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">Ticket Médio</p>
                <p className="text-xl font-bold">R$ {avgPrice.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-warning/10 p-2">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">Duração Média</p>
                <p className="text-xl font-bold">{avgDuration} min</p>
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

        {/* Services by Category */}
        <div className="space-y-4">
          {categories.map(cat => renderCategorySection(cat.id, servicesByCategory[cat.id] || []))}
          {renderCategorySection('uncategorized', servicesByCategory['uncategorized'] || [])}

          {filteredServices.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum serviço encontrado
            </Card>
          )}
        </div>

        {/* Create/Edit Service Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[780px] w-full">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
              <DialogDescription>
                {editingService ? 'Atualize as informações do serviço' : 'Adicione um novo serviço ao catálogo'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 py-2">
              {/* Coluna esquerda: Foto */}
              <div className="space-y-2 sm:row-span-4">
                {isSuperAdmin && !editingService && !profile?.tenant_id && (
                  <div className="space-y-2 mb-2">
                    <Label>Empresa *</Label>
                    <Select
                      value={formData.tenant_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tenant_id: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(() => {
                  const uploadTenantId = editingService?.tenant_id || formData.tenant_id || selectedTenantId || profile?.tenant_id || '';
                  return (
                    <>
                      <Label>Foto do Serviço</Label>
                      <ImageUpload
                        value={formData.image_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                        bucket="service-images"
                        folder={uploadTenantId}
                        aspectRatio="video"
                        maxSizeMB={5}
                        disabled={!uploadTenantId}
                      />
                      {!uploadTenantId && (
                        <p className="text-xs text-muted-foreground">Selecione uma empresa antes de enviar a foto</p>
                      )}
                    </>
                  );
                })()}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição do serviço..."
                    className="resize-none h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Coluna direita: campos principais */}
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
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (min) *</Label>
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
                  disabled={formData.requires_quote}
                  value={formData.requires_quote ? '' : formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              {/* Toggle Preço a consultar */}
              <div className="sm:col-start-2 flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <Switch
                  id="requires_quote"
                  checked={formData.requires_quote}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, requires_quote: v, price: v ? '' : prev.price }))}
                />
                <div>
                  <Label htmlFor="requires_quote" className="font-medium cursor-pointer">Preço a consultar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">O valor varia por avaliação (ex: coloração, progressiva). A IA nunca informará preço.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={addService.isPending || updateService.isPending}>
                {(addService.isPending || updateService.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Category Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Atualize as informações da categoria' : 'Crie uma categoria para organizar seus serviços'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Nome da Categoria *</Label>
                <Input
                  id="categoryName"
                  placeholder="Ex: Cabelo, Unha, Estética..."
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-all ${
                        categoryFormData.color === color.value
                          ? 'ring-2 ring-offset-2 ring-primary scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setCategoryFormData(prev => ({ ...prev, color: color.value }))}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCategory} disabled={addCategory.isPending || updateCategory.isPending}>
                {(addCategory.isPending || updateCategory.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Service Confirmation */}
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

        {/* Delete Category Confirmation */}
        <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os serviços desta categoria ficarão sem categoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
