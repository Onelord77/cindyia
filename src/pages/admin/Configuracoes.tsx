import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
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
} from 'lucide-react';
import { toast } from 'sonner';

const AdminConfiguracoes = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [apiKey] = useState('sk_live_51NxKjLbhDJhgT8...');
  const [webhookSecret] = useState('whsec_9x8df7gD...');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência`);
  };

  const regenerateKey = (keyType: string) => {
    toast.success(`${keyType} regenerado com sucesso!`);
  };

  return (
    <MainLayout>
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
                  <CardTitle>Webhook de Agendamentos</CardTitle>
                  <CardDescription>
                    Receba notificações em tempo real sobre novos agendamentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Endpoint</Label>
                    <Input
                      placeholder="https://seu-servidor.com/webhook/appointments"
                      defaultValue="https://n8n.agendai.com/webhook/appointments"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={webhookSecret}
                          readOnly
                          className="pr-20 font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        >
                          {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => copyToClipboard(webhookSecret, 'Webhook Secret')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => regenerateKey('Webhook Secret')}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use este segredo para validar a assinatura dos webhooks
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Eventos</Label>
                    <div className="space-y-2">
                      {['appointment.created', 'appointment.updated', 'appointment.cancelled', 'appointment.completed'].map((event) => (
                        <div key={event} className="flex items-center justify-between rounded border p-3">
                          <code className="text-sm font-mono">{event}</code>
                          <Switch defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Financeiro</CardTitle>
                  <CardDescription>
                    Receba notificações sobre transações financeiras
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Endpoint</Label>
                    <Input placeholder="https://seu-servidor.com/webhook/financial" />
                  </div>

                  <div className="space-y-2">
                    <Label>Eventos</Label>
                    <div className="space-y-2">
                      {['payment.received', 'payment.refunded', 'invoice.created'].map((event) => (
                        <div key={event} className="flex items-center justify-between rounded border p-3">
                          <code className="text-sm font-mono">{event}</code>
                          <Switch />
                        </div>
                      ))}
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
    </MainLayout>
  );
};

export default AdminConfiguracoes;
