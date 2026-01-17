import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Code2, ExternalLink, Lock, Unlock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemEndpoints, type SystemEndpoint } from '@/hooks/useSystemEndpoints';
import { EndpointFilters } from './EndpointFilters';
import { EndpointDetailsDialog } from './EndpointDetailsDialog';

const methodColors: Record<string, string> = {
  GET: 'bg-success/10 text-success border-success/30',
  POST: 'bg-info/10 text-info border-info/30',
  PUT: 'bg-warning/10 text-warning border-warning/30',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
  PATCH: 'bg-accent/10 text-accent-foreground border-accent/30',
};

export function EndpointManagement() {
  const {
    endpoints,
    isLoading,
    error,
    categories,
    stats,
    searchQuery,
    setSearchQuery,
    methodFilter,
    setMethodFilter,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
  } = useSystemEndpoints();

  const [selectedEndpoint, setSelectedEndpoint] = useState<SystemEndpoint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEndpointClick = (endpoint: SystemEndpoint) => {
    setSelectedEndpoint(endpoint);
    setDialogOpen(true);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar endpoints. Verifique suas permissões.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Code2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Gestão de Endpoints</CardTitle>
            <CardDescription>
              Visualize e monitore todos os endpoints do sistema
            </CardDescription>
          </div>
          {!isLoading && (
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {stats.total} endpoints
              </Badge>
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                {stats.active} ativos
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <EndpointFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          methodFilter={methodFilter}
          onMethodChange={setMethodFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          categories={categories}
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : endpoints.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Code2 className="mx-auto h-12 w-12 opacity-20" />
            <p className="mt-2">Nenhum endpoint encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                onClick={() => handleEndpointClick(endpoint)}
                className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <Badge
                  variant="outline"
                  className={`${methodColors[endpoint.method] || ''} min-w-[60px] justify-center font-mono text-xs`}
                >
                  {endpoint.method}
                </Badge>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{endpoint.display_name}</h4>
                    {endpoint.requires_auth ? (
                      <Lock className="h-3.5 w-3.5 text-warning" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {endpoint.description}
                  </p>
                  <code className="mt-1 block text-xs text-muted-foreground font-mono truncate">
                    {endpoint.url_path}
                  </code>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {endpoint.category && (
                    <Badge variant="secondary" className="text-xs">
                      {endpoint.category}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      endpoint.is_active
                        ? 'text-xs bg-success/10 text-success border-success/30'
                        : 'text-xs'
                    }
                  >
                    {endpoint.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <EndpointDetailsDialog
        endpoint={selectedEndpoint}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
