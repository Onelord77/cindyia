import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Key, Plus, MoreHorizontal, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { useAgentApiKeys, type AgentApiKey } from '@/hooks/useAgentApiKeys';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ApiKeysManagement() {
  const { apiKeys, isLoading, toggleKey, deleteKey, isDeleting } = useAgentApiKeys();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<AgentApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrefix = async (prefix: string, id: string) => {
    await navigator.clipboard.writeText(prefix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (selectedKey) {
      await deleteKey(selectedKey.id);
      setDeleteDialogOpen(false);
      setSelectedKey(null);
    }
  };

  const handleToggle = async (key: AgentApiKey) => {
    await toggleKey({ id: key.id, is_active: !key.is_active });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Chaves de API</CardTitle>
                <CardDescription>
                  Gerencie as chaves de acesso para agentes e integrações externas
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Chave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">Nenhuma chave de API</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Crie uma chave para permitir que agentes acessem os endpoints
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeira chave
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último uso</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => {
                    const expired = isExpired(key.expires_at);
                    return (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{key.name}</p>
                            {key.description && (
                              <p className="text-xs text-muted-foreground">{key.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                              {key.key_prefix}...
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyPrefix(key.key_prefix, key.id)}
                            >
                              {copiedId === key.id ? (
                                <Check className="h-3 w-3 text-success" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Expirada
                            </Badge>
                          ) : key.is_active ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              Inativa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {key.last_used_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(key.last_used_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {key.expires_at ? (
                            <span className={`text-sm ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {format(new Date(key.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={key.is_active && !expired}
                              onCheckedChange={() => handleToggle(key)}
                              disabled={expired}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleCopyPrefix(key.key_prefix, key.id)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar prefixo
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedKey(key);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir chave
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateApiKeyDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chave de API</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a chave <strong>{selectedKey?.name}</strong>?
              Esta ação não pode ser desfeita e qualquer integração usando esta chave deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
