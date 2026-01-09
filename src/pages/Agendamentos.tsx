import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Filter, Plus, MoreVertical, Eye, Edit, Calendar, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppointmentStatus = Database['public']['Enums']['appointment_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

const statusConfig: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Pendente', class: 'status-pending' },
  confirmed: { label: 'Confirmado', class: 'status-confirmed' },
  completed: { label: 'Concluído', class: 'status-completed' },
  cancelled: { label: 'Cancelado', class: 'status-cancelled' },
  no_show: { label: 'Não compareceu', class: 'status-cancelled' },
};

const paymentConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-warning/10 text-warning' },
  paid: { label: 'Pago', class: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelado', class: 'bg-destructive/10 text-destructive' },
  refunded: { label: 'Reembolsado', class: 'bg-muted text-muted-foreground' },
};

const Agendamentos = () => {
  const { appointments, isLoading, addAppointment, updateStatus, deleteAppointment } = useAppointments();
  const { clients } = useClients();
  const { employees } = useEmployees();
  const { services } = useServices();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
  });

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesSearch = 
        appointment.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.services?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      
      if (dateRange?.from && dateRange?.to) {
        const appointmentDate = new Date(appointment.scheduled_at);
        const isInRange = isWithinInterval(appointmentDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
        return matchesSearch && matchesStatus && isInRange;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchTerm, statusFilter, dateRange]);

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_id: '',
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
    });
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.service_id || !formData.employee_id) {
      toast.error('Preencha todos os campos');
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    const scheduledAt = new Date(`${formData.date}T${formData.time}:00`);

    await addAppointment.mutateAsync({
      client_id: formData.client_id,
      service_id: formData.service_id,
      employee_id: formData.employee_id,
      scheduled_at: scheduledAt.toISOString(),
      duration: service?.duration || 30,
      price: service?.price,
    });

    setIsDialogOpen(false);
    resetForm();
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    const payment_status: PaymentStatus | undefined = status === 'completed' ? 'paid' : undefined;
    await updateStatus.mutateAsync({ id, status, payment_status });
    toast.success(`Status atualizado para ${statusConfig[status]?.label}`);
  };

  const handleDelete = async () => {
    if (deletingAppointmentId) {
      await deleteAppointment.mutateAsync(deletingAppointmentId);
      setDeletingAppointmentId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const formatTime = (scheduledAt: string, duration: number) => {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    return {
      startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
    };
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os agendamentos</p>
          </div>
          <Button className="gap-2 w-full sm:w-auto sm:self-end" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="scheduled">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 flex-1">
                  <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} placeholder="Filtrar por período" className="flex-1" />
                  {dateRange && (
                    <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="hidden md:table-cell">Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => {
                    const status = statusConfig[appointment.status || 'scheduled'];
                    const times = formatTime(appointment.scheduled_at, appointment.duration);
                    return (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
                            <div>
                              <p className="font-medium text-sm">{new Date(appointment.scheduled_at).toLocaleDateString('pt-BR')}</p>
                              <p className="text-xs text-muted-foreground">{times.startTime} - {times.endTime}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm truncate max-w-[120px]">{appointment.clients?.name}</p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[120px]">{appointment.services?.name}</p>
                            <p className="text-xs text-muted-foreground">R$ {Number(appointment.price || 0).toFixed(2)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{appointment.employees?.name}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge variant="outline" className={cn(status?.class, 'cursor-pointer text-xs')}>
                                {status?.label}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <DropdownMenuItem key={key} onClick={() => handleStatusChange(appointment.id, key as AppointmentStatus)}>
                                  {config.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingAppointmentId(appointment.id); setIsDeleteDialogOpen(true); }}>
                                Cancelar Agendamento
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Crie um novo agendamento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={formData.service_id} onValueChange={(v) => setFormData(p => ({ ...p, service_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {services.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {Number(s.price).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={formData.employee_id} onValueChange={(v) => setFormData(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.is_active).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input type="time" value={formData.time} onChange={(e) => setFormData(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={addAppointment.isPending}>
                {addAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Agendamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Cancelar Agendamento</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Agendamentos;
