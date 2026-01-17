import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Lock, Unlock, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { SystemEndpoint } from '@/hooks/useSystemEndpoints';

interface EndpointDetailsDialogProps {
  endpoint: SystemEndpoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const methodColors: Record<string, string> = {
  GET: 'bg-success/10 text-success border-success/30',
  POST: 'bg-info/10 text-info border-info/30',
  PUT: 'bg-warning/10 text-warning border-warning/30',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
  PATCH: 'bg-accent/10 text-accent-foreground border-accent/30',
};

export function EndpointDetailsDialog({ endpoint, open, onOpenChange }: EndpointDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!endpoint) return null;

  const fullUrl = `https://pyqkcfgkwdisabklrxfl.supabase.co${endpoint.url_path}`;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (obj: unknown) => {
    if (!obj) return null;
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={methodColors[endpoint.method] || ''}>
              {endpoint.method}
            </Badge>
            <DialogTitle className="text-lg">{endpoint.display_name}</DialogTitle>
          </div>
          <DialogDescription>{endpoint.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* URL */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">URL do Endpoint</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                  {fullUrl}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">Tipo</h4>
                <p className="text-sm capitalize">{endpoint.type.replace('_', ' ')}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">Categoria</h4>
                <p className="text-sm">{endpoint.category || 'Sem categoria'}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <div className="flex items-center gap-1.5">
                  {endpoint.is_active ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm text-success">Ativo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Inativo</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">Autenticação</h4>
                <div className="flex items-center gap-1.5">
                  {endpoint.requires_auth ? (
                    <>
                      <Lock className="h-4 w-4 text-warning" />
                      <span className="text-sm">Requer autenticação</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Público</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Parâmetros esperados */}
            {endpoint.expected_params && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Parâmetros Esperados</h4>
                <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto">
                  {formatJson(endpoint.expected_params)}
                </pre>
              </div>
            )}

            {/* Exemplo de resposta */}
            {endpoint.response_example && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Exemplo de Resposta</h4>
                <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto">
                  {formatJson(endpoint.response_example)}
                </pre>
              </div>
            )}

            <Separator />

            {/* Datas */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Criado em: {format(new Date(endpoint.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              <span>
                Atualizado em: {format(new Date(endpoint.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
