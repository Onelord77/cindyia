import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Phone, Mail, Clock, Edit, Trash2, UserCog } from 'lucide-react';
import { mockEmployees as initialEmployees, mockServices } from '@/lib/mock-data';
import { Employee, WorkSchedule } from '@/types';
import { toast } from 'sonner';

const weekDays = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const Funcionarios = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee' as 'admin' | 'employee',
    services: [] as string[],
    workSchedule: weekDays.map(day => ({
      dayOfWeek: day.value,
      startTime: '09:00',
      endTime: '18:00',
      isActive: day.value >= 1 && day.value <= 5,
    })) as WorkSchedule[],
  });

  const adminsCount = employees.filter(e => e.role === 'admin').length;
  const workingToday = employees.filter(e => {
    const today = new Date().getDay();
    return e.isActive && e.workSchedule.some(s => s.dayOfWeek === today && s.isActive);
  }).length;

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'employee',
      services: [],
      workSchedule: weekDays.map(day => ({
        dayOfWeek: day.value,
        startTime: '09:00',
        endTime: '18:00',
        isActive: day.value >= 1 && day.value <= 5,
      })),
    });
    setEditingEmployee(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      services: employee.services,
      workSchedule: weekDays.map(day => {
        const existing = employee.workSchedule.find(s => s.dayOfWeek === day.value);
        return existing || {
          dayOfWeek: day.value,
          startTime: '09:00',
          endTime: '18:00',
          isActive: false,
        };
      }),
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.services.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }

    if (editingEmployee) {
      setEmployees(prev => prev.map(e => 
        e.id === editingEmployee.id 
          ? {
              ...e,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              role: formData.role,
              services: formData.services,
              workSchedule: formData.workSchedule.filter(s => s.isActive),
            }
          : e
      ));
      toast.success('Funcionário atualizado com sucesso!');
    } else {
      const newEmployee: Employee = {
        id: Date.now().toString(),
        tenantId: '1',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        services: formData.services,
        workSchedule: formData.workSchedule.filter(s => s.isActive),
        isActive: true,
        createdAt: new Date(),
      };
      setEmployees(prev => [...prev, newEmployee]);
      toast.success('Funcionário cadastrado com sucesso!');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = (employeeId: string) => {
    setEmployees(prev => prev.map(e => 
      e.id === employeeId ? { ...e, isActive: !e.isActive } : e
    ));
    toast.success('Status do funcionário atualizado');
  };

  const handleDelete = () => {
    if (deletingEmployeeId) {
      setEmployees(prev => prev.filter(e => e.id !== deletingEmployeeId));
      toast.success('Funcionário excluído com sucesso!');
      setDeletingEmployeeId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (employeeId: string) => {
    setDeletingEmployeeId(employeeId);
    setIsDeleteDialogOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId],
    }));
  };

  const toggleWorkDay = (dayOfWeek: number) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: prev.workSchedule.map(s =>
        s.dayOfWeek === dayOfWeek ? { ...s, isActive: !s.isActive } : s
      ),
    }));
  };

  const updateWorkTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: prev.workSchedule.map(s =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      ),
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground">Gerencie sua equipe e seus horários de trabalho</p>
          </div>

          <Button className="gap-2" onClick={openNewDialog}>
            <Plus className="h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <UserCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Funcionários</p>
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
                <p className="text-sm text-muted-foreground">Trabalhando Hoje</p>
                <p className="text-2xl font-bold">{workingToday}</p>
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

        {/* Employee Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
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
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={employee.isActive}
                      onCheckedChange={() => handleToggleActive(employee.id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {employee.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {employee.email}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Serviços</p>
                  <div className="flex flex-wrap gap-1">
                    {employee.services.map((serviceId) => {
                      const service = mockServices.find(s => s.id === serviceId);
                      return (
                        <Badge key={serviceId} variant="outline" className="text-xs">
                          {service?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Horários</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {employee.workSchedule.filter(s => s.isActive).map((schedule) => {
                      const dayName = weekDays.find(d => d.value === schedule.dayOfWeek)?.label;
                      return (
                        <div key={schedule.dayOfWeek} className="flex justify-between bg-muted/50 rounded px-2 py-1">
                          <span className="font-medium">{dayName?.slice(0, 3)}</span>
                          <span className="text-muted-foreground">
                            {schedule.startTime}-{schedule.endTime}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(employee)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(employee.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Atualize as informações do funcionário' : 'Adicione um novo membro à sua equipe'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input 
                    id="name" 
                    placeholder="Nome do funcionário"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input 
                    id="phone" 
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'employee') => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Funcionário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Serviços que realiza *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {mockServices.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`service-${service.id}`}
                        checked={formData.services.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <label
                        htmlFor={`service-${service.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {service.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Horários de Trabalho</Label>
                <div className="space-y-2">
                  {weekDays.map((day) => {
                    const schedule = formData.workSchedule.find(s => s.dayOfWeek === day.value);
                    return (
                      <div key={day.value} className="flex items-center gap-4 rounded-lg border p-3">
                        <div className="flex items-center space-x-2 w-24">
                          <Checkbox 
                            id={`day-${day.value}`}
                            checked={schedule?.isActive || false}
                            onCheckedChange={() => toggleWorkDay(day.value)}
                          />
                          <label htmlFor={`day-${day.value}`} className="text-sm font-medium">
                            {day.label}
                          </label>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <Input 
                            type="time" 
                            value={schedule?.startTime || '09:00'} 
                            className="w-28"
                            disabled={!schedule?.isActive}
                            onChange={(e) => updateWorkTime(day.value, 'startTime', e.target.value)}
                          />
                          <span className="text-muted-foreground">às</span>
                          <Input 
                            type="time" 
                            value={schedule?.endTime || '18:00'} 
                            className="w-28"
                            disabled={!schedule?.isActive}
                            onChange={(e) => updateWorkTime(day.value, 'endTime', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingEmployee ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O funcionário será removido permanentemente.
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

export default Funcionarios;
