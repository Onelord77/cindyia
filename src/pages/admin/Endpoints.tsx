import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useSystemEndpoints } from '@/hooks/useSystemEndpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Server, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import type { SystemEndpoint } from '@/hooks/useSystemEndpoints';

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const AdminEndpoints = () => {
  const {
    endpoints,
    isLoading,
    stats,
    categories,
    searchQuery,
    setSearchQuery,
    methodFilter,
    setMethodFilter,
    categoryFilter,
    setCategoryFilter,
  } = useSystemEndpoints();

  const [selectedEndpoint, setSelectedEndpoint] = useState<SystemEndpoint | null>(null);

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Endpoints do Sistema</h1>
          <p className="text-muted-foreground">
            Catálogo de endpoints e Edge Functions da plataforma
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total de Endpoints"
            value={stats.total}
            icon={<Server className="h-5 w-5" />}
            variant="primary"
          />
          <StatsCard
            title="Ativos"
            value={stats.active}
            icon={<Server className="h-5 w-5" />}
            variant="success"
          />
          <StatsCard
            title="Métodos"
            value={Object.keys(stats.byMethod).length}
            subtitle={Object.entries(stats.byMethod).map(([m, c]) => `${m}: ${c}`).join(', ')}
            icon={<Server className="h-5 w-5" />}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, path ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endpoints ({endpoints.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((endpoint) => (
                  <TableRow key={endpoint.id}>
                    <TableCell className="font-medium">{endpoint.display_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {endpoint.url_path}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={methodColors[endpoint.method] || ''}>
                        {endpoint.method}
                      </Badge>
                    </TableCell>
                    <TableCell>{endpoint.category || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={endpoint.requires_auth ? 'default' : 'secondary'}>
                        {endpoint.requires_auth ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={endpoint.is_active ? 'default' : 'destructive'}>
                        {endpoint.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedEndpoint(endpoint)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {endpoints.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum endpoint encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedEndpoint} onOpenChange={() => setSelectedEndpoint(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="outline" className={methodColors[selectedEndpoint?.method || ''] || ''}>
                  {selectedEndpoint?.method}
                </Badge>
                {selectedEndpoint?.display_name}
              </DialogTitle>
            </DialogHeader>
            {selectedEndpoint && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{selectedEndpoint.description}</p>
                  <p className="font-mono text-sm mt-1 bg-muted p-2 rounded">
                    {selectedEndpoint.url_path}
                  </p>
                </div>

                {selectedEndpoint.expected_params && (
                  <div>
                    <h4 className="font-medium mb-2">Parâmetros Esperados</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedEndpoint.expected_params, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedEndpoint.response_example && (
                  <div>
                    <h4 className="font-medium mb-2">Exemplo de Resposta</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedEndpoint.response_example, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Tipo: {selectedEndpoint.type}</span>
                  <span>Categoria: {selectedEndpoint.category}</span>
                  <span>Auth: {selectedEndpoint.requires_auth ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminEndpoints;
