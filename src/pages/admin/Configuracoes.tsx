import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Key,
  Webhook,
  Shield,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Server,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useWhatsappApi } from '@/hooks/useWhatsappApi';

const AdminConfiguracoes = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [apiKey] = useState('sk_live_51NxKjLbhDJhgT8...');
  const [webhookSecret] = useState('whsec_9x8df7gD...');

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência`);
  };

  const regenerateKey = (keyType: string) => {
    toast.success(`${keyType} regenerado com sucesso!`);
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
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="api" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
            </TabsTrigger>
          </TabsList>

          {/* API Keys */}
          <TabsContent value="api">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Chaves de API</CardTitle>
                      <CardDescription>
                        Gerencie suas chaves de acesso à API do sistema
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                      <CheckCircle className="mr-1 h-3 w-3" /> Ativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>API Key de Produção</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          readOnly
                          className="pr-20 font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => copyToClipboard(apiKey, 'API Key')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => regenerateKey('API Key')}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use esta chave para autenticar requisições à API em produção
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>API Key de Teste</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value="sk_test_51NxKjLbhDJhgT8..."
                        readOnly
                        className="flex-1 font-mono text-sm"
                      />
                      <Button variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use esta chave para testes em ambiente de desenvolvimento
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo de Teste</Label>
                      <p className="text-sm text-muted-foreground">
                        Ativar modo de teste para todas as empresas
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Limites de Uso</CardTitle>
                  <CardDescription>Configurações de rate limit e quotas</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rateLimit">Requisições por minuto</Label>
                    <Input id="rateLimit" type="number" defaultValue="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyLimit">Limite diário</Label>
                    <Input id="dailyLimit" type="number" defaultValue="100000" />
                  </div>
                </CardContent>
              </Card>
            </div>
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

          {/* System */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Globais</CardTitle>
                  <CardDescription>
                    Configurações que afetam todas as empresas do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo Manutenção</Label>
                      <p className="text-sm text-muted-foreground">
                        Desabilita acesso ao sistema para usuários não-admin
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Novos Cadastros</Label>
                      <p className="text-sm text-muted-foreground">
                        Permitir novas empresas se cadastrarem
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">Mensagem de Manutenção</Label>
                    <Textarea
                      id="maintenanceMessage"
                      placeholder="Sistema em manutenção. Voltaremos em breve!"
                      defaultValue="O sistema está passando por uma atualização programada. Voltaremos em instantes."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backup e Logs</CardTitle>
                  <CardDescription>
                    Configurações de backup automático e registro de logs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Backup Automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Realizar backup diário às 3h
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="logRetention">Retenção de Logs (dias)</Label>
                    <Input id="logRetention" type="number" defaultValue="90" className="w-32" />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminConfiguracoes;
