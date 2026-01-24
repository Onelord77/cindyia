import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useWhatsappApi } from '@/hooks/useWhatsappApi';
import { useAuth } from '@/hooks/useAuth';
import { useTenantLimits } from '@/hooks/useTenantLimits';
import { toast } from 'sonner';
import {
  MessageCircle,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Unplug,
  Loader2,
  Smartphone,
  Wifi,
  WifiOff,
  Shield,
  AlertTriangle,
} from 'lucide-react';

export function WhatsAppIntegration() {
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);

  const { isSuperAdmin, isAdmin } = useAuth();
  const { maxWhatsappInstances } = useTenantLimits();
  const canManageInstances = isSuperAdmin || isAdmin;

  const {
    isLoading,
    qrCode,
    instances,
    fetchInstances,
    createInstance,
    connectInstance,
    getConnectionStatus,
    disconnectInstance,
    deleteInstance,
    clearQRCode,
    startStatusPolling,
    stopStatusPolling,
  } = useWhatsappApi();

  const currentInstanceCount = instances.length;
  const hasReachedLimit = !isSuperAdmin && currentInstanceCount >= maxWhatsappInstances;

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;

    if (!isSuperAdmin && currentInstanceCount >= maxWhatsappInstances) {
      toast.error(`Limite atingido! Sua empresa pode ter no máximo ${maxWhatsappInstances} instância(s).`);
      return;
    }

    const result = await createInstance(newInstanceName.trim());
    if (result) {
      setNewInstanceName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleConnect = useCallback(async (instanceName: string) => {
    setSelectedInstance(instanceName);
    clearQRCode();
    setIsQRDialogOpen(true);

    await connectInstance(instanceName);

    startStatusPolling(instanceName, () => {
      setIsQRDialogOpen(false);
      fetchInstances();
    });
  }, [clearQRCode, connectInstance, startStatusPolling, fetchInstances]);

  const handleRefreshQR = useCallback(async () => {
    if (selectedInstance) {
      await connectInstance(selectedInstance);
    }
  }, [selectedInstance, connectInstance]);

  const handleQRDialogChange = useCallback((open: boolean) => {
    setIsQRDialogOpen(open);
    if (!open) {
      stopStatusPolling();
    }
  }, [stopStatusPolling]);

  const handleCheckStatus = async (instanceName: string) => {
    await getConnectionStatus(instanceName);
    await fetchInstances();
  };

  const getInstanceStatus = (instance: { instanceName: string; status?: string }) => {
    const status = instance.status?.toLowerCase();
    if (status === 'open' || status === 'connected' || status === 'online') {
      return { label: 'Conectado', variant: 'success' as const, icon: Wifi };
    }
    if (status === 'connecting' || status === 'qrcode') {
      return { label: 'Conectando', variant: 'warning' as const, icon: RefreshCw };
    }
    return { label: 'Desconectado', variant: 'destructive' as const, icon: WifiOff };
  };

  if (!canManageInstances) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-success/10 text-success">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Business</CardTitle>
              <CardDescription className="text-sm">
                Você não tem permissão para gerenciar integrações do WhatsApp
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-success/10 text-success">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Business</CardTitle>
              <CardDescription className="text-sm">
                Gerencie suas instâncias do WhatsApp
              </CardDescription>
            </div>
            {isAdmin && !isSuperAdmin && (
              <Badge variant="outline" className="ml-2 border-primary/30 bg-primary/10 text-primary">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>

          {!isSuperAdmin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentInstanceCount} de {maxWhatsappInstances} instância(s)</span>
              {hasReachedLimit && (
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Limite atingido
                </Badge>
              )}
            </div>
          )}

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2"
                disabled={hasReachedLimit}
                title={hasReachedLimit ? `Limite de ${maxWhatsappInstances} instância(s) atingido` : 'Criar nova instância'}
              >
                <Plus className="h-4 w-4" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>
                  Dê um nome para sua nova instância do WhatsApp
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="ex: minha-barbearia"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateInstance()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras, números e hífens. Sem espaços.
                  </p>
                </div>
                <Button
                  onClick={handleCreateInstance}
                  disabled={isLoading || !newInstanceName.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Instância
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {instances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma instância configurada</p>
            <p className="text-sm">Crie uma nova instância para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((instance) => {
              const status = getInstanceStatus(instance);
              const StatusIcon = status.icon;

              return (
                <div
                  key={instance.instanceName}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-muted">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{instance.instanceName}</p>
                      {instance.profileName && (
                        <p className="text-sm text-muted-foreground">
                          {instance.profileName}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        status.variant === 'success'
                          ? 'border-success/30 bg-success/10 text-success'
                          : status.variant === 'warning'
                          ? 'border-warning/30 bg-warning/10 text-warning'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {status.variant !== 'success' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(instance.instanceName)}
                        disabled={isLoading}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        Conectar
                      </Button>
                    )}

                    {status.variant === 'success' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectInstance(instance.instanceName)}
                        disabled={isLoading}
                      >
                        <Unplug className="h-4 w-4 mr-1" />
                        Desconectar
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCheckStatus(instance.instanceName)}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Instância</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a instância "{instance.instanceName}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteInstance(instance.instanceName)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        <Button
          variant="outline"
          className="w-full"
          onClick={fetchInstances}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar Lista
        </Button>
      </CardContent>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={handleQRDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {isLoading && !qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCode ? (
              <>
                <div
                  className="p-6 bg-white rounded-xl shadow-sm border"
                  style={{ minWidth: '320px', minHeight: '320px' }}
                >
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-72 h-72 block"
                    style={{
                      imageRendering: 'pixelated',
                      filter: 'contrast(1.1)',
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Abra o WhatsApp no seu celular, vá em <strong>Dispositivos Conectados</strong> e escaneie o código
                </p>
                <Button variant="outline" onClick={handleRefreshQR} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar QR
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  A conexão será detectada automaticamente
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <QrCode className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">QR Code não disponível</p>
                <Button onClick={handleRefreshQR} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Gerar QR Code
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
