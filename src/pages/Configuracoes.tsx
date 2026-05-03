import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Clock, Bell, Save, Loader2, Palette, Bot } from 'lucide-react';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { BUSINESS_TYPES, OTHER_BUSINESS_TYPE, splitBusinessType } from '@/lib/business-types';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandingSettings } from '@/features/branding/BrandingSettings';
import { AIContextSettings } from '@/components/ai-context/AIContextSettings';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
];

const Configuracoes = () => {
  const { 
    settings, 
    loading, 
    saving, 
    saveSettings, 
    updateSetting, 
    toggleWorkingDay 
  } = useTenantSettings();

  const handleSave = async () => {
    await saveSettings(settings);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do seu estabelecimento</p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamento</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Identidade Visual</span>
            </TabsTrigger>
            <TabsTrigger value="ai-context" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Contexto da IA</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Settings */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>Dados básicos do seu estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input 
                      id="companyName" 
                      value={settings.companyName}
                      onChange={(e) => updateSetting('companyName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone para contato</Label>
                    <Input
                      id="phone"
                      value={settings.phone}
                      onChange={(e) => updateSetting('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={settings.address}
                    onChange={(e) => updateSetting('address', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                  />
                </div>

                {(() => {
                  const { preset, custom } = splitBusinessType(settings.businessType);
                  const isOther = preset === OTHER_BUSINESS_TYPE;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Tipo de negócio</Label>
                      <Select
                        value={preset}
                        onValueChange={(value) => {
                          if (value === OTHER_BUSINESS_TYPE) {
                            updateSetting('businessType', custom || OTHER_BUSINESS_TYPE);
                          } else {
                            updateSetting('businessType', value);
                          }
                        }}
                      >
                        <SelectTrigger id="businessType">
                          <SelectValue placeholder="Selecione o segmento da sua empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((bt) => (
                            <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isOther && (
                        <Input
                          placeholder="Descreva o segmento"
                          value={custom}
                          onChange={(e) => updateSetting('businessType', e.target.value || OTHER_BUSINESS_TYPE)}
                          className="mt-2"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Essa informação é usada pela IA de atendimento para contextualizar respostas aos seus clientes.
                      </p>
                    </div>
                  );
                })()}

                <Separator />

                <div className="flex justify-end">
                  <Button className="gap-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduling Settings */}
          <TabsContent value="scheduling">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Horário de Funcionamento</CardTitle>
                  <CardDescription>Defina os horários de atendimento do estabelecimento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="openTime">Abertura</Label>
                      <Input 
                        id="openTime" 
                        type="time" 
                        value={settings.openTime}
                        onChange={(e) => updateSetting('openTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closeTime">Fechamento</Label>
                      <Input 
                        id="closeTime" 
                        type="time" 
                        value={settings.closeTime}
                        onChange={(e) => updateSetting('closeTime', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dias de Funcionamento</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = settings.workingDays.includes(day.key);
                        return (
                          <Button
                            key={day.key}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="w-12"
                            onClick={() => toggleWorkingDay(day.key)}
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button className="gap-2" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações Automáticas</CardTitle>
                <CardDescription>Configure os avisos enviados aos clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmação de Agendamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem ao confirmar agendamento
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifyOnConfirmation}
                    onCheckedChange={(checked) => updateSetting('notifyOnConfirmation', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembrete de Agendamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lembrete antes do horário marcado
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifyOnReminder}
                    onCheckedChange={(checked) => updateSetting('notifyOnReminder', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderTime">Enviar lembrete com antecedência de</Label>
                  <Select 
                    value={settings.reminderHours}
                    onValueChange={(value) => updateSetting('reminderHours', value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="2">2 horas</SelectItem>
                      <SelectItem value="24">1 dia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aviso de Cancelamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar quando agendamento for cancelado
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifyOnCancellation}
                    onCheckedChange={(checked) => updateSetting('notifyOnCancellation', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notificationGroupJid">Grupo de Notificações (WhatsApp)</Label>
                  <p className="text-sm text-muted-foreground">
                    ID do grupo para receber alertas de novos agendamentos pendentes e leads. Ex: <code className="text-xs bg-muted px-1 rounded">120363XXXXXXXX@g.us</code>
                  </p>
                  <Input
                    id="notificationGroupJid"
                    placeholder="120363XXXXXXXX@g.us"
                    value={settings.notificationGroupJid}
                    onChange={(e) => updateSetting('notificationGroupJid', e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button className="gap-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Settings */}
          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          {/* AI Context Settings */}
          <TabsContent value="ai-context">
            <Card>
              <CardHeader>
                <CardTitle>Contexto da IA</CardTitle>
                <CardDescription>Configure a personalidade e o conhecimento do seu atendente virtual</CardDescription>
              </CardHeader>
              <CardContent>
                <AIContextSettings />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
