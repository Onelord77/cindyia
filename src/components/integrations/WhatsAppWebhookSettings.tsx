import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Settings, 
  Webhook, 
  Save,
  Shield,
  Bell,
  MessageSquare,
  Users,
  FileText,
  Image,
  Video,
  Mic,
  MapPin,
  Contact,
} from 'lucide-react';

interface WebhookEvent {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

export function WhatsAppWebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [events, setEvents] = useState<WebhookEvent[]>([
    { id: 'messages.upsert', name: 'Mensagens Recebidas', description: 'Notificar quando novas mensagens chegarem', icon: MessageSquare, enabled: true },
    { id: 'messages.update', name: 'Mensagens Atualizadas', description: 'Notificar quando mensagens forem lidas ou editadas', icon: FileText, enabled: true },
    { id: 'connection.update', name: 'Status da Conexão', description: 'Notificar quando o status da conexão mudar', icon: Bell, enabled: true },
    { id: 'contacts.upsert', name: 'Novos Contatos', description: 'Notificar quando novos contatos forem adicionados', icon: Users, enabled: false },
    { id: 'groups.upsert', name: 'Grupos', description: 'Notificar sobre atualizações em grupos', icon: Users, enabled: false },
    { id: 'qrcode.updated', name: 'QR Code Atualizado', description: 'Notificar quando o QR Code for atualizado', icon: Shield, enabled: false },
  ]);

  const [messageTypes, setMessageTypes] = useState({
    text: true,
    image: true,
    video: true,
    audio: true,
    document: true,
    location: false,
    contact: false,
  });

  const toggleEvent = (eventId: string) => {
    setEvents(events.map(event => 
      event.id === eventId ? { ...event, enabled: !event.enabled } : event
    ));
  };

  const toggleMessageType = (type: keyof typeof messageTypes) => {
    setMessageTypes({ ...messageTypes, [type]: !messageTypes[type] });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Here you would save the webhook configuration to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações de webhook salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2 bg-primary/10 text-primary">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Configurações de Webhook</CardTitle>
            <CardDescription className="text-sm">
              Configure webhooks para receber notificações em tempo real
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto border-primary/30 bg-primary/10 text-primary">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">URL do Webhook</Label>
            <Input
              id="webhookUrl"
              type="url"
              placeholder="https://seu-servidor.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Endpoint que receberá as notificações via POST
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Secret do Webhook (opcional)</Label>
            <Input
              id="webhookSecret"
              type="password"
              placeholder="sua-chave-secreta"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Chave para validar a autenticidade das requisições
            </p>
          </div>
        </div>

        <Separator />

        {/* Events */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Eventos
          </h4>
          <div className="grid gap-3">
            {events.map((event) => {
              const Icon = event.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={event.enabled}
                    onCheckedChange={() => toggleEvent(event.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Message Types */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Tipos de Mensagem
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'text' as const, label: 'Texto', icon: FileText },
              { key: 'image' as const, label: 'Imagem', icon: Image },
              { key: 'video' as const, label: 'Vídeo', icon: Video },
              { key: 'audio' as const, label: 'Áudio', icon: Mic },
              { key: 'document' as const, label: 'Documento', icon: FileText },
              { key: 'location' as const, label: 'Localização', icon: MapPin },
              { key: 'contact' as const, label: 'Contato', icon: Contact },
            ].map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  messageTypes[key] 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => toggleMessageType(key)}
              >
                <Icon className={`h-4 w-4 ${messageTypes[key] ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm ${messageTypes[key] ? 'font-medium' : ''}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !webhookUrl}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Settings className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
