import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Phone, Mail, Clock, Edit, Trash2, UserCog, Loader2, Building2, Scissors, Calendar, Coffee, Search } from 'lucide-react';
import { WorkingHoursEditor, formatWorkingHoursSummary, type WorkingHours, type CompanyHours, type BreaksConfig, type BreakPeriod } from '@/components/employees/WorkingHoursEditor';
import { BreaksEditor, formatBreaksSummary } from '@/components/employees/BreaksEditor';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useTenants } from '@/hooks/useTenants';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useEmployeeServices, useEmployeeServicesBulk } from '@/hooks/useEmployeeServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPhoneMask, unmaskPhone } from '@/lib/utils';

const Funcionarios = () => {
  const { isSuperAdmin, profile } = useAuth();
  const { tenants } = useTenants();
  const { createUser } = useUserManagement();
  
  // Super admin can select a tenant, regular admins use their own tenant
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // Determine which tenant to use
  const activeTenantId = isSuperAdmin ? selectedTenantId : profile?.tenant_id;
  
  const { employees, isLoading, addEmployee, updateEmployee, deleteEmployee, toggleEmployeeActive } = useEmployees(activeTenantId || undefined);
  const { services } = useServices(activeTenantId || undefined);

  // Get employee IDs for bulk services fetch
  const employeeIds = useMemo(() => employees.map(e => e.id), [employees]);
  const { data: employeeServicesMap = {} } = useEmployeeServicesBulk(employeeIds);

  // Memoize filtered data to avoid filtering on every render
  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'active'), [tenants]);
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<typeof employees[0] | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [createWithAuth, setCreateWithAuth] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    selectedServiceIds: [] as string[],
    workingHours: {} as WorkingHours,
    breaks: { breaks: [] } as BreaksConfig,
    password: '',
  });

  // Hook for managing employee-service links (mutations)
  const { updateEmployeeServices } = useEmployeeServices();

  // Load linked services + working hours when editing an employee
  // (uses the already-fetched bulk map to support older employees reliably)
  useEffect(() => {
    if (!editingEmployee) return;

    const existingServiceIds = employeeServicesMap[editingEmployee.id]?.map(es => es.serviceId) ?? [];

    setFormData(prev => ({
      ...prev,
      // Avoid wiping user changes if the bulk map arrives after opening the dialog
      selectedServiceIds: prev.selectedServiceIds.length ? prev.selectedServiceIds : existingServiceIds,
      workingHours: (editingEmployee.working_hours as unknown as WorkingHours) || {},
      breaks: ((editingEmployee.working_hours as Record<string, unknown>)?.breaks as BreaksConfig) || { breaks: [] },
    }));
  }, [editingEmployee, employeeServicesMap]);

  const adminsCount = employees.filter(e => e.role === 'admin').length;
  const activeCount = employees.filter(e => e.is_active).length;

  // For super admins, get tenant from selection; for regular admins, fetch their own tenant
  const { data: currentTenant } = useQuery({
    queryKey: ['current-tenant', activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', activeTenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  // Use currentTenant for both super admins and regular admins
  const selectedTenant = isSuperAdmin 
    ? tenants.find(t => t.id === activeTenantId) || currentTenant
    : currentTenant;

  // Extrair horários da empresa para restringir horários dos funcionários
  const companyHours: CompanyHours | undefined = selectedTenant?.settings ? {
    openTime: (selectedTenant.settings as Record<string, unknown>).openTime as string || '09:00',
    closeTime: (selectedTenant.settings as Record<string, unknown>).closeTime as string || '19:00',
    workingDays: (selectedTenant.settings as Record<string, unknown>).workingDays as string[] || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
  } : undefined;

  // Função para ajustar horários do funcionário aos limites da empresa
  const adjustWorkingHoursToCompany = (workingHours: WorkingHours, company: CompanyHours): WorkingHours => {
    const adjusted: WorkingHours = {};
    const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

    for (const day of days) {
      const schedule = workingHours[day];
      if (!schedule) {
        adjusted[day] = { enabled: false, start: company.openTime, end: company.closeTime };
        continue;
      }

      // Se o dia não está nos dias de trabalho da empresa, desabilita
      if (!company.workingDays.includes(day)) {
        adjusted[day] = { ...schedule, enabled: false };
        continue;
      }

      // Ajusta horários para ficarem dentro dos limites
      const clampTime = (time: string, field: 'start' | 'end'): string => {
        const [h, m] = time.split(':').map(Number);
        const [openH, openM] = company.openTime.split(':').map(Number);
        const [closeH, closeM] = company.closeTime.split(':').map(Number);

        const timeMins = h * 60 + m;
        const openMins = openH * 60 + openM;
        const closeMins = closeH * 60 + closeM;

        if (field === 'start' && timeMins < openMins) return company.openTime;
        if (field === 'end' && timeMins > closeMins) return company.closeTime;
        return time;
      };

      adjusted[day] = {
        enabled: schedule.enabled,
        start: clampTime(schedule.start || company.openTime, 'start'),
        end: clampTime(schedule.end || company.closeTime, 'end'),
      };
    }

    return adjusted;
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: 'employee', selectedServiceIds: [], workingHours: {}, breaks: { breaks: [] }, password: '' });
    setEditingEmployee(null);
    setCreateWithAuth(false);
    setServiceSearch('');
  };

  // Filtrar serviços ativos pela busca
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return activeServices;
    const search = serviceSearch.toLowerCase();
    return activeServices.filter(s =>
      s.name.toLowerCase().includes(search)
    );
  }, [activeServices, serviceSearch]);

  // Valida se pelo menos um dia de trabalho está configurado
  const hasValidWorkingHours = (): boolean => {
    const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    return days.some(day => {
      const schedule = formData.workingHours[day];
      return schedule?.enabled && schedule.start && schedule.end;
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!hasValidWorkingHours()) {
      toast.error('Configure o horário de atendimento em pelo menos um dia');
      return;
    }

    // Check employee limit when creating new employee (not editing)
    if (!editingEmployee && selectedTenant) {
      const maxEmployees = selectedTenant.max_employees || 10;
      if (employees.length >= maxEmployees) {
        toast.error(`Limite de funcionários atingido (${maxEmployees}). Entre em contato para aumentar o plano.`);
        return;
      }
    }

    let employeeId: string | null = null;

    // Remove mask from phone before saving
    const phoneDigitsOnly = formData.phone ? unmaskPhone(formData.phone, '') : '';

    if (editingEmployee) {
      // Update existing employee (no auth change)
      await updateEmployee.mutateAsync({
        id: editingEmployee.id,
        name: formData.name,
        email: formData.email,
        phone: phoneDigitsOnly,
        role: formData.role,
        working_hours: JSON.parse(JSON.stringify({ ...formData.workingHours, breaks: formData.breaks })),
      });
      employeeId = editingEmployee.id;
      
      // Update employee services
      await updateEmployeeServices.mutateAsync({
        employeeId: editingEmployee.id,
        serviceIds: formData.selectedServiceIds,
      });
    } else if (createWithAuth && activeTenantId) {
      // Create user with authentication - requires email for login
      if (!formData.email) {
        toast.error('E-mail é obrigatório para criar acesso ao sistema');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        toast.error('Senha deve ter no mínimo 6 caracteres');
        return;
      }
      
      await createUser.mutateAsync({
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        tenantId: activeTenantId,
        role: formData.role === 'admin' ? 'admin' : 'user',
        phone: phoneDigitsOnly || undefined,
      });
      // Note: Services will be linked after creating employee record via separate mutation
    } else {
      // Create employee without auth (legacy method)
      const newEmployee = await addEmployee.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: phoneDigitsOnly,
        role: formData.role,
        working_hours: JSON.parse(JSON.stringify({ ...formData.workingHours, breaks: formData.breaks })),
      });
      
      // Link services to new employee
      if (newEmployee && formData.selectedServiceIds.length > 0) {
        await updateEmployeeServices.mutateAsync({
          employeeId: newEmployee.id,
          serviceIds: formData.selectedServiceIds,
        });
      }
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean | null) => {
    await toggleEmployeeActive.mutateAsync({ id, is_active: !currentStatus });
  };

  const handleDelete = async () => {
    if (deletingEmployeeId) {
      await deleteEmployee.mutateAsync(deletingEmployeeId);
      setDeletingEmployeeId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  // Super admin without selected tenant
  if (isSuperAdmin && !selectedTenantId) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground">Selecione uma empresa para gerenciar seus funcionários</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Selecionar Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-full max-w-md min-h-[44px]">
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {activeTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin && selectedTenant ? (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {selectedTenant.name}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary"
                    onClick={() => setSelectedTenantId('')}
                  >
                    (trocar)
                  </Button>
                </span>
              ) : (
                'Gerencie sua equipe'
              )}
            </p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <UserCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-success/10 p-3">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-warning/10 p-3">
                <UserCog className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold">{adminsCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedTenant && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Limite de funcionários: {employees.length} / {selectedTenant.max_employees || 10}
                </span>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (employees.length / (selectedTenant.max_employees || 10)) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum funcionário cadastrado
              </CardContent>
            </Card>
          ) : (
            employees.map((employee) => (
              <Card key={employee.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{employee.name}</CardTitle>
                        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                          {employee.role === 'admin' ? 'Administrador' : 'Funcionário'}
                        </Badge>
                      </div>
                    </div>
                    <Switch 
                      checked={employee.is_active || false} 
                      onCheckedChange={() => handleToggleActive(employee.id, employee.is_active)} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {employee.phone || '-'}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {employee.email || '-'}
                    </div>
                  </div>
                  {/* Display working hours summary */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatWorkingHoursSummary(employee.working_hours as unknown as WorkingHours)}
                    </span>
                  </div>
                  {/* Display breaks summary */}
                  {((employee.working_hours as Record<string, unknown>)?.breaks as BreaksConfig)?.breaks?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatBreaksSummary(((employee.working_hours as Record<string, unknown>)?.breaks as BreaksConfig)?.breaks)}
                      </span>
                    </div>
                  )}
                  {/* Display linked services */}
                  {employeeServicesMap[employee.id] && employeeServicesMap[employee.id].length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Scissors className="h-3 w-3" />
                        Serviços
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {employeeServicesMap[employee.id].map((es) => (
                          <Badge key={es.serviceId} variant="outline" className="text-xs">
                            {es.service?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Nenhum serviço vinculado
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => {
                        setEditingEmployee(employee);
                        // Use services from the bulk map that's already loaded
                        const existingServiceIds = employeeServicesMap[employee.id]?.map(es => es.serviceId) || [];

                        // Carrega horários do funcionário e ajusta aos limites da empresa
                        const rawWorkingHours = (employee.working_hours as unknown as WorkingHours) || {};
                        const adjustedWorkingHours = companyHours
                          ? adjustWorkingHoursToCompany(rawWorkingHours, companyHours)
                          : rawWorkingHours;

                        setFormData({
                          name: employee.name,
                          email: employee.email || '',
                          phone: employee.phone ? formatPhoneMask(employee.phone) : '',
                          role: employee.role || 'employee',
                          selectedServiceIds: existingServiceIds,
                          workingHours: adjustedWorkingHours,
                          breaks: ((employee.working_hours as Record<string, unknown>)?.breaks as BreaksConfig) || { breaks: [] },
                          password: '',
                        });
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive" 
                      onClick={() => { 
                        setDeletingEmployeeId(employee.id); 
                        setIsDeleteDialogOpen(true); 
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Editar' : 'Novo'} Funcionário</DialogTitle>
              <DialogDescription>
                {editingEmployee 
                  ? 'Atualize os dados do funcionário' 
                  : 'Adicione um novo membro à equipe'
                }
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados" className="gap-2">
                  <UserCog className="h-4 w-4" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="servicos" className="gap-2">
                  <Scissors className="h-4 w-4" />
                  Serviços
                </TabsTrigger>
                <TabsTrigger value="horarios" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Horários
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="dados" className="mt-0 space-y-4 pr-4">
                  {!editingEmployee && (
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="create-auth" 
                        checked={createWithAuth} 
                        onCheckedChange={setCreateWithAuth}
                      />
                      <Label htmlFor="create-auth" className="text-sm">
                        Criar com acesso ao sistema (login)
                      </Label>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail {createWithAuth && '*'}</Label>
                      <Input 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        className="min-h-[44px]"
                        placeholder={createWithAuth ? 'Obrigatório para login' : 'Opcional'}
                      />
                    </div>
                  </div>
                  
                  {createWithAuth && !editingEmployee && (
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <Input 
                        type="password"
                        value={formData.password} 
                        onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                        className="min-h-[44px]"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: formatPhoneMask(e.target.value) }))}
                        className="min-h-[44px]"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(v) => setFormData(p => ({ ...p, role: v }))}
                      >
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Funcionário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="servicos" className="mt-0 pr-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Scissors className="h-4 w-4" />
                        Serviços que pode realizar
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecione os serviços que este funcionário está habilitado a realizar
                      </p>
                    </div>

                    {/* Busca e ações */}
                    {activeServices.length > 0 && (
                      <div className="flex items-center gap-2">
                        {activeServices.length > 5 && (
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Buscar serviço..."
                              value={serviceSearch}
                              onChange={(e) => setServiceSearch(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            const allSelected = activeServices.every(s => formData.selectedServiceIds.includes(s.id));
                            setFormData(prev => ({
                              ...prev,
                              selectedServiceIds: allSelected ? [] : activeServices.map(s => s.id)
                            }));
                          }}
                        >
                          {activeServices.every(s => formData.selectedServiceIds.includes(s.id))
                            ? 'Desmarcar todos'
                            : 'Selecionar todos'
                          }
                        </Button>
                      </div>
                    )}

                    <div className="rounded-md border">
                      {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum serviço cadastrado</p>
                      ) : filteredServices.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum serviço encontrado</p>
                      ) : (
                        <ScrollArea className="h-[240px]">
                          <div className="space-y-1 p-3">
                            {filteredServices.map((service) => (
                              <div
                                key={service.id}
                                className={`flex items-start space-x-3 p-2 rounded-md transition-colors cursor-pointer hover:bg-muted/50 ${
                                  formData.selectedServiceIds.includes(service.id) ? 'bg-primary/5' : ''
                                }`}
                                onClick={() => {
                                  const isSelected = formData.selectedServiceIds.includes(service.id);
                                  setFormData(prev => ({
                                    ...prev,
                                    selectedServiceIds: isSelected
                                      ? prev.selectedServiceIds.filter(id => id !== service.id)
                                      : [...prev.selectedServiceIds, service.id]
                                  }));
                                }}
                              >
                                <Checkbox
                                  id={`service-${service.id}`}
                                  checked={formData.selectedServiceIds.includes(service.id)}
                                  onCheckedChange={(checked) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selectedServiceIds: checked
                                        ? [...prev.selectedServiceIds, service.id]
                                        : prev.selectedServiceIds.filter(id => id !== service.id)
                                    }));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <label
                                    htmlFor={`service-${service.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer"
                                  >
                                    {service.name}
                                  </label>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {service.duration} min • R$ {Number(service.price).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formData.selectedServiceIds.length} serviço(s) selecionado(s)
                      {activeServices.length > 0 && ` de ${activeServices.length} disponíveis`}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="horarios" className="mt-0 pr-4 space-y-6">
                  <WorkingHoursEditor
                    value={formData.workingHours}
                    onChange={(value) => setFormData(p => ({ ...p, workingHours: value }))}
                    companyHours={companyHours}
                  />
                  
                  <BreaksEditor
                    value={formData.breaks}
                    onChange={(value) => setFormData(p => ({ ...p, breaks: value }))}
                    workingHoursStart={formData.workingHours?.default?.start || companyHours?.openTime || '09:00'}
                    workingHoursEnd={formData.workingHours?.default?.end || companyHours?.closeTime || '18:00'}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={addEmployee.isPending || updateEmployee.isPending || createUser.isPending}
                className="min-h-[44px]"
              >
                {(addEmployee.isPending || updateEmployee.isPending || createUser.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground min-h-[44px]"
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

export default Funcionarios;
