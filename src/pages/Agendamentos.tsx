import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  MessageCircle,
  PenLine,
  Calendar,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { mockClients, mockEmployees, mockServices } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Appointment, AppointmentStatus, PaymentStatus } from '@/types';
import { toast } from 'sonner';
import { useAppStore } from '@/hooks/useAppStore';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pendente', class: 'status-pending' },
  confirmed: { label: 'Confirmado', class: 'status-confirmed' },
  completed: { label: 'Concluído', class: 'status-completed' },
  cancelled: { label: 'Cancelado', class: 'status-cancelled' },
};

const paymentConfig = {
  pending: { label: 'Pendente', class: 'bg-warning/10 text-warning' },
  paid: { label: 'Pago', class: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelado', class: 'bg-destructive/10 text-destructive' },
  no_charge: { label: 'Sem Cobrança', class: 'bg-muted text-muted-foreground' },
};

const Agendamentos = () => {
  const { appointments, updateAppointment, addAppointment, deleteAppointment, completeAppointment } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
  });

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesSearch = 
        appointment.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.service?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      
      // Date filter
      if (dateRange?.from && dateRange?.to) {
        const appointmentDate = new Date(appointment.date);
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
      clientId: '',
      serviceId: '',
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
    });
    setEditingAppointment(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      employeeId: appointment.employeeId,
      date: new Date(appointment.date).toISOString().split('T')[0],
      time: appointment.startTime,
    });
    setIsDialogOpen(true);
  };

  const openViewDialog = (appointment: Appointment) => {
    setViewingAppointment(appointment);
    setIsViewDialogOpen(true);
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!formData.clientId || !formData.serviceId || !formData.employeeId || !formData.date || !formData.time) {
      toast.error('Preencha todos os campos');
      return;
    }

    const client = mockClients.find(c => c.id === formData.clientId);
    const service = mockServices.find(s => s.id === formData.serviceId);
    const employee = mockEmployees.find(e => e.id === formData.employeeId);
    const endTime = calculateEndTime(formData.time, service?.duration || 30);

    if (editingAppointment) {
      updateAppointment(editingAppointment.id, {
        clientId: formData.clientId,
        client,
        serviceId: formData.serviceId,
        service,
        employeeId: formData.employeeId,
        employee,
        date: new Date(formData.date),
        startTime: formData.time,
        endTime,
      });
      toast.success('Agendamento atualizado com sucesso!');
    } else {
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        tenantId: '1',
        clientId: formData.clientId,
        client,
        serviceId: formData.serviceId,
        service,
        employeeId: formData.employeeId,
        employee,
        date: new Date(formData.date),
        startTime: formData.time,
        endTime,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date(),
        createdBy: 'manual',
      };
      addAppointment(newAppointment);
      toast.success('Agendamento criado com sucesso!');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    if (newStatus === 'completed') {
      // Use the completeAppointment function which also generates financial entry
      completeAppointment(appointmentId);
      toast.success('Agendamento concluído! Receita gerada automaticamente.');
    } else {
      const paymentStatus: PaymentStatus = newStatus === 'cancelled' ? 'cancelled' : 'pending';
      updateAppointment(appointmentId, { status: newStatus, paymentStatus });
      toast.success(`Status atualizado para ${statusConfig[newStatus].label}`);
    }
  };

  const handlePaymentChange = (appointmentId: string, newPayment: PaymentStatus) => {
    updateAppointment(appointmentId, { paymentStatus: newPayment });
    toast.success(`Pagamento atualizado para ${paymentConfig[newPayment].label}`);
  };

  const handleDelete = () => {
    if (deletingAppointmentId) {
      deleteAppointment(deletingAppointmentId);
      toast.success('Agendamento cancelado com sucesso!');
      setDeletingAppointmentId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (appointmentId: string) => {
    setDeletingAppointmentId(appointmentId);
    setIsDeleteDialogOpen(true);
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os agendamentos do seu salão</p>
          </div>

          <Button className="gap-2 min-h-[44px] w-full sm:w-auto sm:self-end" onClick={openNewDialog}>
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[44px]"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 flex-1">
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder="Filtrar por período"
                    className="flex-1"
                  />
                  {dateRange && (
                    <Button variant="ghost" size="icon" onClick={clearDateFilter} className="min-h-[44px] min-w-[44px]">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Data/Hora</TableHead>
                  <TableHead className="min-w-[120px]">Cliente</TableHead>
                  <TableHead className="min-w-[120px]">Serviço</TableHead>
                  <TableHead className="min-w-[100px] hidden md:table-cell">Profissional</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Pagamento</TableHead>
                  <TableHead className="min-w-[80px] hidden lg:table-cell">Origem</TableHead>
                  <TableHead className="text-right min-w-[60px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => {
                    const status = statusConfig[appointment.status];
                    const payment = paymentConfig[appointment.paymentStatus];

                    return (
                      <TableRow key={appointment.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
                            <div>
                              <p className="font-medium text-sm">
                                {new Date(appointment.date).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {appointment.startTime} - {appointment.endTime}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[120px]">{appointment.client?.name}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{appointment.client?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[120px]">{appointment.service?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {appointment.service?.price.toFixed(2)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{appointment.employee?.name}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge variant="outline" className={cn(status.class, 'cursor-pointer text-xs')}>
                                {status.label}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={() => handleStatusChange(appointment.id, key as AppointmentStatus)}
                                >
                                  {config.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge variant="secondary" className={cn(payment.class, 'cursor-pointer text-xs')}>
                                {payment.label}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(paymentConfig).map(([key, config]) => (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={() => handlePaymentChange(appointment.id, key as PaymentStatus)}
                                >
                                  {config.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {appointment.createdBy === 'whatsapp' ? (
                            <div className="flex items-center gap-1 text-success">
                              <MessageCircle className="h-4 w-4" />
                              <span className="text-xs">WhatsApp</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <PenLine className="h-4 w-4" />
                              <span className="text-xs">Manual</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 sm:opacity-0 sm:group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openViewDialog(appointment)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(appointment)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                                disabled={appointment.status === 'confirmed'}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                Confirmar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(appointment.id, 'completed')}
                                disabled={appointment.status === 'completed'}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                                Marcar Concluído
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => openDeleteDialog(appointment.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
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

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
              <DialogDescription>
                {editingAppointment ? 'Atualize as informações do agendamento' : 'Crie um novo agendamento manualmente'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Serviço *</Label>
                <Select value={formData.serviceId} onValueChange={(value) => setFormData(prev => ({ ...prev, serviceId: value }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockServices.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee">Profissional *</Label>
                <Select value={formData.employeeId} onValueChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Input 
                    id="time" 
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="min-h-[44px]">
                {editingAppointment ? 'Salvar Alterações' : 'Criar Agendamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Agendamento</DialogTitle>
            </DialogHeader>
            {viewingAppointment && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{viewingAppointment.client?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{viewingAppointment.client?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Serviço</p>
                    <p className="font-medium">{viewingAppointment.service?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-medium">R$ {viewingAppointment.service?.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profissional</p>
                    <p className="font-medium">{viewingAppointment.employee?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium">{new Date(viewingAppointment.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horário</p>
                    <p className="font-medium">{viewingAppointment.startTime} - {viewingAppointment.endTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusConfig[viewingAppointment.status].class}>
                      {statusConfig[viewingAppointment.status].label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="min-h-[44px]">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá cancelar o agendamento. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="min-h-[44px]">Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Cancelar Agendamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Agendamentos;
