import { useState, useMemo } from 'react';
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
import { Plus, Phone, Mail, Clock, Edit, Trash2, UserCog, Loader2 } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { toast } from 'sonner';

const Funcionarios = () => {
  const { employees, isLoading, addEmployee, updateEmployee, deleteEmployee, toggleEmployeeActive } = useEmployees();
  const { services } = useServices();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<typeof employees[0] | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    specialties: [] as string[],
  });

  const adminsCount = employees.filter(e => e.role === 'admin').length;
  const activeCount = employees.filter(e => e.is_active).length;

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: 'employee', specialties: [] });
    setEditingEmployee(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }

    if (editingEmployee) {
      await updateEmployee.mutateAsync({
        id: editingEmployee.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        specialties: formData.specialties,
      });
    } else {
      await addEmployee.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        specialties: formData.specialties,
      });
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

  if (isLoading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight">Funcionários</h1><p className="text-muted-foreground">Gerencie sua equipe</p></div>
          <Button className="gap-2" onClick={() => { resetForm(); setIsDialogOpen(true); }}><Plus className="h-4 w-4" />Novo Funcionário</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="flex items-center gap-4 p-6"><div className="rounded-full bg-primary/10 p-3"><UserCog className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{employees.length}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-6"><div className="rounded-full bg-success/10 p-3"><Clock className="h-6 w-6 text-success" /></div><div><p className="text-sm text-muted-foreground">Ativos</p><p className="text-2xl font-bold">{activeCount}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-6"><div className="rounded-full bg-warning/10 p-3"><UserCog className="h-6 w-6 text-warning" /></div><div><p className="text-sm text-muted-foreground">Administradores</p><p className="text-2xl font-bold">{adminsCount}</p></div></CardContent></Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.length === 0 ? (
            <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">Nenhum funcionário cadastrado</CardContent></Card>
          ) : (
            employees.map((employee) => (
              <Card key={employee.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary text-primary-foreground font-semibold">{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback></Avatar>
                      <div><CardTitle className="text-base">{employee.name}</CardTitle><Badge variant={employee.role === 'admin' ? 'default' : 'secondary'} className="mt-1">{employee.role === 'admin' ? 'Administrador' : 'Funcionário'}</Badge></div>
                    </div>
                    <Switch checked={employee.is_active || false} onCheckedChange={() => handleToggleActive(employee.id, employee.is_active)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{employee.phone || '-'}</div>
                    <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{employee.email || '-'}</div>
                  </div>
                  {employee.specialties && employee.specialties.length > 0 && (
                    <div><p className="text-sm font-medium mb-2">Especialidades</p><div className="flex flex-wrap gap-1">{employee.specialties.map((spec, i) => <Badge key={i} variant="outline" className="text-xs">{spec}</Badge>)}</div></div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingEmployee(employee); setFormData({ name: employee.name, email: employee.email || '', phone: employee.phone || '', role: employee.role || 'employee', specialties: employee.specialties || [] }); setIsDialogOpen(true); }}><Edit className="h-4 w-4 mr-1" />Editar</Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeletingEmployeeId(employee.id); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{editingEmployee ? 'Editar' : 'Novo'} Funcionário</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} /></div><div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Telefone</Label><Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} /></div><div className="space-y-2"><Label>Função</Label><Select value={formData.role} onValueChange={(v) => setFormData(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employee">Funcionário</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={addEmployee.isPending || updateEmployee.isPending}>{(addEmployee.isPending || updateEmployee.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir funcionário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Funcionarios;
