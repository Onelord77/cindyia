import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { OnboardingFormData } from './CompanyInfoStep';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
];

interface ScheduleStepProps {
  data: OnboardingFormData;
  onChange: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void;
}

export function ScheduleStep({ data, onChange }: ScheduleStepProps) {
  const toggleDay = (dayKey: string) => {
    const newDays = data.workingDays.includes(dayKey)
      ? data.workingDays.filter((d) => d !== dayKey)
      : [...data.workingDays, dayKey];
    onChange('workingDays', newDays);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="openTime">Abertura *</Label>
          <Input
            id="openTime"
            type="time"
            value={data.openTime}
            onChange={(e) => onChange('openTime', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closeTime">Fechamento *</Label>
          <Input
            id="closeTime"
            type="time"
            value={data.closeTime}
            onChange={(e) => onChange('closeTime', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dias de Funcionamento *</Label>
        <p className="text-sm text-muted-foreground">
          Selecione pelo menos um dia
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = data.workingDays.includes(day.key);
            return (
              <Button
                key={day.key}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="w-12"
                onClick={() => toggleDay(day.key)}
              >
                {day.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
