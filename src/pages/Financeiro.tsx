import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useAppointments } from '@/hooks/useAppointments';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const incomeCategories = ['Serviços', 'Produtos', 'Outros'];
const expenseCategories = ['Aluguel', 'Materiais', 'Salários', 'Contas', 'Outros'];

const Financeiro = () => {
  const isMobile = useIsMobile();
  const { financialEntries: entries, isLoading, addFinancialEntry: addEntry, updateFinancialEntry: updateEntry, deleteFinancialEntry: deleteEntry } = useFinancialEntries();
  const { appointments } = useAppointments();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<typeof entries[0] | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesType = activeTab === 'all' || entry.type === activeTab;
      
      if (dateRange?.from && dateRange?.to) {
        const entryDate = new Date(entry.date);
        const isInRange = isWithinInterval(entryDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
        return matchesType && isInRange;
      }
      
      return matchesType;
    });
  }, [entries, activeTab, dateRange]);

  const totalIncome = filteredEntries
    .filter((e) => e.type === 'income')
    .reduce((acc, e) => acc + Number(e.amount), 0);

  const totalExpense = filteredEntries
    .filter((e) => e.type === 'expense')
    .reduce((acc, e) => acc + Number(e.amount), 0);

  const pendingPayments = appointments
    .filter((a) => a.payment_status === 'pending' && a.status !== 'cancelled')
    .reduce((acc, a) => acc + Number(a.price || 0), 0);

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingEntry(null);
  };

  const openNewDialog = (type: 'income' | 'expense') => {
    resetForm();
    setFormData(prev => ({ ...prev, type }));
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry: typeof entries[0]) => {
    setEditingEntry(entry);
    setFormData({
      type: entry.type,
      category: entry.category,
      description: entry.description || '',
      amount: String(entry.amount),
      date: new Date(entry.date).toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.description || !formData.amount || !formData.date) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (editingEntry) {
      await updateEntry.mutateAsync({
        id: editingEntry.id,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
      });
    } else {
      await addEntry.mutateAsync({
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingEntryId) {
      await deleteEntry.mutateAsync(deletingEntryId);
      setDeletingEntryId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (entryId: string) => {
    setDeletingEntryId(entryId);
    setIsDeleteDialogOpen(true);
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;

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
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Controle suas receitas e despesas</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-2 min-h-[44px]" onClick={() => openNewDialog('expense')}>
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
              Nova Despesa
            </Button>
            <Button className="gap-2 min-h-[44px]" onClick={() => openNewDialog('income')}>
              <ArrowUpCircle className="h-4 w-4" />
              Nova Receita
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Receitas</p>
                  <p className="text-lg sm:text-2xl font-bold text-success truncate">
                    R$ {totalIncome.toLocaleString('pt-BR')}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-success/30 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Despesas</p>
                  <p className="text-lg sm:text-2xl font-bold text-destructive truncate">
                    R$ {totalExpense.toLocaleString('pt-BR')}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-destructive/30 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Saldo</p>
                  <p className={cn(
                    'text-lg sm:text-2xl font-bold truncate',
                    totalIncome - totalExpense >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    R$ {(totalIncome - totalExpense).toLocaleString('pt-BR')}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary/30 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">A Receber</p>
                  <p className="text-lg sm:text-2xl font-bold text-warning truncate">
                    R$ {pendingPayments.toLocaleString('pt-BR')}
                  </p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-warning/30 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none min-h-[40px]">Todos</TabsTrigger>
              <TabsTrigger value="income" className="flex-1 sm:flex-none min-h-[40px]">Receitas</TabsTrigger>
              <TabsTrigger value="expense" className="flex-1 sm:flex-none min-h-[40px]">Despesas</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                placeholder="Filtrar por período"
              />
              {dateRange && (
                <Button variant="ghost" size="icon" onClick={clearDateFilter} className="min-h-[44px] min-w-[44px]">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {filteredEntries.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum lançamento encontrado
                  </p>
                ) : isMobile ? (
                  <div className="divide-y">
                    {filteredEntries.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between p-4 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                entry.type === 'income'
                                  ? 'border-success/30 bg-success/10 text-success'
                                  : 'border-destructive/30 bg-destructive/10 text-destructive'
                              )}
                            >
                              {entry.type === 'income' ? (
                                <ArrowUpCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <ArrowDownCircle className="mr-1 h-3 w-3" />
                              )}
                              {entry.type === 'income' ? 'Receita' : 'Despesa'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">{entry.category}</p>
                          <p className={cn(
                            'text-base font-bold mt-1',
                            entry.type === 'income' ? 'text-success' : 'text-destructive'
                          )}>
                            {entry.type === 'income' ? '+' : '-'} R$ {Number(entry.amount).toFixed(2)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openDeleteDialog(entry.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Data</TableHead>
                          <TableHead className="min-w-[100px]">Tipo</TableHead>
                          <TableHead className="min-w-[100px]">Categoria</TableHead>
                          <TableHead className="min-w-[150px]">Descrição</TableHead>
                          <TableHead className="text-right min-w-[100px]">Valor</TableHead>
                          <TableHead className="text-right min-w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(entry.date).toLocaleDateString('pt-BR')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  entry.type === 'income'
                                    ? 'border-success/30 bg-success/10 text-success'
                                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                                )}
                              >
                                {entry.type === 'income' ? (
                                  <ArrowUpCircle className="mr-1 h-3 w-3" />
                                ) : (
                                  <ArrowDownCircle className="mr-1 h-3 w-3" />
                                )}
                                {entry.type === 'income' ? 'Receita' : 'Despesa'}
                              </Badge>
                            </TableCell>
                            <TableCell>{entry.category}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-semibold', entry.type === 'income' ? 'text-success' : 'text-destructive')}>
                                {entry.type === 'income' ? '+' : '-'} R$ {Number(entry.amount).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => openDeleteDialog(entry.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry 
                  ? 'Editar Lançamento' 
                  : formData.type === 'income' ? 'Nova Receita' : 'Nova Despesa'}
              </DialogTitle>
              <DialogDescription>
                {editingEntry 
                  ? 'Atualize as informações do lançamento'
                  : `Registre uma ${formData.type === 'income' ? 'receita' : 'despesa'} manualmente`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!editingEntry && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'income' | 'expense') => setFormData(prev => ({ ...prev, type: value, category: '' }))}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição do lançamento..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={addEntry.isPending || updateEntry.isPending} className="min-h-[44px]">
                {(addEntry.isPending || updateEntry.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEntry ? 'Salvar Alterações' : 'Criar Lançamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
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

export default Financeiro;
