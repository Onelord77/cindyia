import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ApiKeysManagement } from '@/components/integrations/ApiKeysManagement';
import {
  Key,
  Webhook,
  Shield,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useWhatsappApi } from '@/hooks/useWhatsappApi';

const AdminConfiguracoes = () => {
  // Webhook de atendimento (WhatsApp)
  const { data: whatsappWebhookUrl, isLoading: isLoadingWebhook } = useSystemSetting('whatsapp_webhook_url');
  const updateSetting = useUpdateSystemSetting();
  const { setWebhookAll } = useWhatsappApi();
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [isApplyingWebhook, setIsApplyingWebhook] = useState(false);

  useEffect(() => {
    if (whatsappWebhookUrl !== undefined) {
      setWebhookUrlInput(whatsappWebhookUrl);
    }
  }, [whatsappWebhookUrl]);

  const handleSaveWebhookUrl = async () => {
    updateSetting.mutate(
      { key: 'whatsapp_webhook_url', value: webhookUrlInput.trim() },
      {
        onSuccess: async () => {
          if (webhookUrlInput.trim()) {
            setIsApplyingWebhook(true);
            try {
              const result = await setWebhookAll();
              if (result?.configured > 0) {
                toast.success(`Webhook aplicado em ${result.configured} instância(s) conectada(s)`);
              } else if (result?.skipped) {
                toast.info('Nenhuma instância conectada para aplicar o webhook');
              }
            } catch (error) {
              console.error('Error applying webhook to instances:', error);
            } finally {
              setIsApplyingWebhook(false);
            }
          }
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Configurações do Administrador</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Gerencie API Keys, Webhooks e configurações sensíveis do sistema
          </p>
        </div>

        {/* Warning Banner */}
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium text-warning">Área Restrita</p>
              <p className="text-sm text-muted-foreground">
                As informações nesta página são confidenciais e de acesso exclusivo para super administradores.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="api" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
          </TabsList>

          {/* API Keys */}
          <TabsContent value="api">
            <ApiKeysManagement />
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Webhook de Atendimento (WhatsApp)</CardTitle>
                      <CardDescription>
                        URL que receberá eventos de mensagens e conexão de todas as instâncias WhatsApp
                      </CardDescription>
                    </div>
                    {whatsappWebhookUrl && (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                        <CheckCircle className="mr-1 h-3 w-3" /> Configurado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Webhook</Label>
                    {isLoadingWebhook ? (
                      <div className="flex items-center gap-2 h-10">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Carregando...</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://seu-servidor.com/webhook/whatsapp"
                          value={webhookUrlInput}
                          onChange={(e) => setWebhookUrlInput(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSaveWebhookUrl}
                          disabled={updateSetting.isPending || isApplyingWebhook}
                          className="gap-2"
                        >
                          {updateSetting.isPending || isApplyingWebhook ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {isApplyingWebhook ? 'Aplicando...' : 'Salvar'}
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Este webhook será configurado automaticamente em cada instância WhatsApp ao conectar
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Eventos Monitorados</Label>
                    <div className="space-y-2">
                      {[
                        { event: 'messages', description: 'Novas mensagens recebidas' },
                        { event: 'connection', description: 'Alterações no estado da conexão' },
                      ].map(({ event, description }) => (
                        <div key={event} className="flex items-center justify-between rounded border p-3">
                          <div>
                            <code className="text-sm font-mono">{event}</code>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                          <Switch checked disabled />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Filtros Ativos</Label>
                    <div className="flex items-center justify-between rounded border p-3">
                      <div>
                        <code className="text-sm font-mono">excludeMessages: wasSentByApi</code>
                        <p className="text-xs text-muted-foreground">Previne loops em automações</p>
                      </div>
                      <Switch checked disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminConfiguracoes;
