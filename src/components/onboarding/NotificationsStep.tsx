import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OnboardingFormData } from './CompanyInfoStep';

interface NotificationsStepProps {
  data: OnboardingFormData;
  onChange: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void;
}

export function NotificationsStep({ data, onChange }: NotificationsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Confirmação de Agendamento</Label>
          <p className="text-sm text-muted-foreground">
            Enviar mensagem ao confirmar agendamento
          </p>
        </div>
        <Switch
          checked={data.notifyOnConfirmation}
          onCheckedChange={(checked) => onChange('notifyOnConfirmation', checked)}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Lembrete de Agendamento</Label>
            <p className="text-sm text-muted-foreground">
              Enviar lembrete antes do horário marcado
            </p>
          </div>
          <Switch
            checked={data.notifyOnReminder}
            onCheckedChange={(checked) => onChange('notifyOnReminder', checked)}
          />
        </div>

        {data.notifyOnReminder && (
          <div className="space-y-2 pl-1">
            <Label>Enviar lembrete com antecedência de</Label>
            <Select
              value={data.reminderHours}
              onValueChange={(value) => onChange('reminderHours', value)}
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
        )}
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
          checked={data.notifyOnCancellation}
          onCheckedChange={(checked) => onChange('notifyOnCancellation', checked)}
        />
      </div>
    </div>
  );
}
