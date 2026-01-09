import { useState } from 'react';
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
  Trash2,
  MessageCircle,
  PenLine,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { mockAppointments as initialAppointments, mockClients, mockEmployees, mockServices } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Appointment, AppointmentStatus, PaymentStatus } from '@/types';
import { toast } from 'sonner';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
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

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = 
      appointment.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      date: appointment.date.toISOString().split('T')[0],
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
      setAppointments(prev => prev.map(a => 
        a.id === editingAppointment.id 
          ? {
              ...a,
              clientId: formData.clientId,
              client,
              serviceId: formData.serviceId,
              service,
              employeeId: formData.employeeId,
              employee,
              date: new Date(formData.date),
              startTime: formData.time,
              endTime,
            }
          : a
      ));
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
      setAppointments(prev => [newAppointment, ...prev]);
      toast.success('Agendamento criado com sucesso!');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        const paymentStatus: PaymentStatus = newStatus === 'cancelled' ? 'cancelled' : a.paymentStatus;
        return { ...a, status: newStatus, paymentStatus };
      }
      return a;
    }));
    toast.success(`Status atualizado para ${statusConfig[newStatus].label}`);
  };

  const handlePaymentChange = (appointmentId: string, newPayment: PaymentStatus) => {
    setAppointments(prev => prev.map(a => 
      a.id === appointmentId ? { ...a, paymentStatus: newPayment } : a
    ));
    toast.success(`Pagamento atualizado para ${paymentConfig[newPayment].label}`);
  };

  const handleDelete = () => {
    if (deletingAppointmentId) {
      setAppointments(prev => prev.filter(a => a.id !== deletingAppointmentId));
      toast.success('Agendamento cancelado com sucesso!');
      setDeletingAppointmentId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (appointmentId: string) => {
    setDeletingAppointmentId(appointmentId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os agendamentos do seu salão</p>
          </div>

          <Button className="gap-2" onClick={openNewDialog}>
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => {
                  const status = statusConfig[appointment.status];
                  const payment = paymentConfig[appointment.paymentStatus];

                  return (
                    <TableRow key={appointment.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {appointment.date.toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appointment.startTime} - {appointment.endTime}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{appointment.client?.name}</p>
                          <p className="text-sm text-muted-foreground">{appointment.client?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{appointment.service?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {appointment.service?.price.toFixed(2)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.employee?.name}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge variant="outline" className={cn(status.class, 'cursor-pointer')}>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge variant="secondary" className={cn(payment.class, 'cursor-pointer')}>
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
                      <TableCell>
                        {appointment.createdBy === 'whatsapp' ? (
                          <div className="flex items-center gap-1 text-success">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-sm">WhatsApp</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <PenLine className="h-4 w-4" />
                            <span className="text-sm">Manual</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
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
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
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
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Serviço *</Label>
                <Select value={formData.serviceId} onValueChange={(value) => setFormData(prev => ({ ...prev, serviceId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {service.price} ({service.duration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee">Profissional *</Label>
                <Select value={formData.employeeId} onValueChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input 
                    type="date" 
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Input 
                    type="time" 
                    id="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingAppointment ? 'Salvar Alterações' : 'Criar Agendamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
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
                    <p className="text-sm text-muted-foreground">{viewingAppointment.client?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profissional</p>
                    <p className="font-medium">{viewingAppointment.employee?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Serviço</p>
                    <p className="font-medium">{viewingAppointment.service?.name}</p>
                    <p className="text-sm text-muted-foreground">R$ {viewingAppointment.service?.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">{viewingAppointment.date.toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-muted-foreground">{viewingAppointment.startTime} - {viewingAppointment.endTime}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={cn(statusConfig[viewingAppointment.status].class)}>
                      {statusConfig[viewingAppointment.status].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pagamento</p>
                    <Badge variant="secondary" className={cn(paymentConfig[viewingAppointment.paymentStatus].class)}>
                      {paymentConfig[viewingAppointment.paymentStatus].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Origem</p>
                  <p className="font-medium">{viewingAppointment.createdBy === 'whatsapp' ? 'WhatsApp' : 'Manual'}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewDialogOpen(false)}>
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
                Esta ação irá cancelar o agendamento. O cliente será notificado sobre o cancelamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
