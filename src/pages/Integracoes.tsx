import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { WhatsAppIntegration } from '@/components/integrations/WhatsAppIntegration';
import { EndpointManagement } from '@/components/integrations/EndpointManagement';
import { ApiKeysManagement } from '@/components/integrations/ApiKeysManagement';
import { useAuth } from '@/hooks/useAuth';
import {
  Mail,
  CreditCard,
  Calendar,
  Check,
  ExternalLink,
} from 'lucide-react';

const integrations = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sincronize agendamentos com o Google Calendar',
    icon: Calendar,
    status: 'disconnected',
    color: 'bg-info/10 text-info',
  },
  {
    id: 'email',
    name: 'E-mail Marketing',
    description: 'Envie campanhas e comunicados para seus clientes',
    icon: Mail,
    status: 'disconnected',
    color: 'bg-warning/10 text-warning',
  },
  {
    id: 'payment',
    name: 'Pagamentos Online',
    description: 'Aceite pagamentos via Pix, cartão de crédito e débito',
    icon: CreditCard,
    status: 'disconnected',
    color: 'bg-primary/10 text-primary',
  },
];

const Integracoes = () => {
  const { isSuperAdmin } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? 'Conecte suas ferramentas favoritas para automatizar seu negócio'
              : 'Gerencie suas instâncias do WhatsApp'
            }
          </p>
        </div>

        {/* WhatsApp Integration - Available for Admin and Super Admin */}
        <WhatsAppIntegration />

        {/* API Keys Management - For Admin and Super Admin */}
        <ApiKeysManagement />

        {/* Endpoint Management - Only for Super Admin */}
        {isSuperAdmin && <EndpointManagement />}

        {/* Other Integrations - Only for Super Admin */}
        {isSuperAdmin && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                const isConnected = integration.status === 'connected';

                return (
                  <Card key={integration.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${integration.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {integration.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            isConnected
                              ? 'border-success/30 bg-success/10 text-success'
                              : 'border-muted'
                          }
                        >
                          {isConnected ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" /> Conectado
                            </span>
                          ) : (
                            'Desconectado'
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch id={`${integration.id}-enabled`} checked={isConnected} />
                          <Label htmlFor={`${integration.id}-enabled`} className="text-sm">
                            {isConnected ? 'Ativo' : 'Inativo'}
                          </Label>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          Configurar
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Notification Settings - Only for Super Admin */}
            <Card>
              <CardHeader>
                <CardTitle>Notificações Automáticas</CardTitle>
                <CardDescription>
                  Configure quando e como os clientes recebem avisos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmação de Agendamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem ao confirmar agendamento
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembrete de Agendamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lembrete 2h antes do horário marcado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aviso de Cancelamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar quando agendamento for cancelado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Integracoes;
