import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  Loader2,
  MessageCircle,
  Wifi,
  WifiOff,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminWhatsappStatus } from '@/hooks/useAdminWhatsappStatus';
import { toast } from 'sonner';

const AdminWhatsAppInstances = () => {
  const {
    instances,
    disconnectedCount,
    connectedCount,
    totalCount,
    tenantsWithIssues,
    isLoading,
    refetch,
    isConnected,
  } = useAdminWhatsappStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return instances.filter((inst) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        inst.tenant_name.toLowerCase().includes(term) ||
        inst.instance_name.toLowerCase().includes(term) ||
        (inst.profile_name || '').toLowerCase().includes(term);

      const connected = isConnected(inst.status);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'connected' && connected) ||
        (statusFilter === 'disconnected' && !connected);

      return matchesSearch && matchesStatus;
    });
  }, [instances, searchTerm, statusFilter, isConnected]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Status atualizado');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Instâncias WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento global das conexões UAZAPI de todos os tenants
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 min-h-[44px] w-full sm:w-auto"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Atualizar status
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{totalCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-success/10 p-2">
                <Wifi className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conectadas</p>
                <p className="text-lg font-bold">{connectedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-destructive/10 p-2">
                <WifiOff className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Desconectadas</p>
                <p className="text-lg font-bold">{disconnectedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-warning/10 p-2">
                <Building2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Empresas afetadas</p>
                <p className="text-lg font-bold">{tenantsWithIssues.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa, instância ou perfil..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[44px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="connected">Conectadas</SelectItem>
                  <SelectItem value="disconnected">Desconectadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Instância</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma instância encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inst) => {
                    const connected = isConnected(inst.status);
                    return (
                      <TableRow key={inst.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <p className="font-medium text-sm">{inst.tenant_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inst.instance_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inst.profile_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs gap-1',
                              connected
                                ? 'border-success/30 bg-success/10 text-success'
                                : 'border-destructive/30 bg-destructive/10 text-destructive'
                            )}
                          >
                            {connected ? (
                              <Wifi className="h-3 w-3" />
                            ) : (
                              <WifiOff className="h-3 w-3" />
                            )}
                            {connected ? 'Conectada' : inst.status || 'desconhecido'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inst.updated_at
                            ? new Date(inst.updated_at).toLocaleString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                              })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsAppInstances;
