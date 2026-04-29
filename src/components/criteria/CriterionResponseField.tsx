import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/hooks/useAuth';
import type { ServiceCriterion } from '@/types/criteria';

interface Props {
  criterion: ServiceCriterion;
  value: string;
  isCustomAnswer?: boolean;
  onChange: (value: string, isCustomAnswer?: boolean) => void;
  appointmentId?: string | null;
}

export function CriterionResponseField({
  criterion,
  value,
  isCustomAnswer = false,
  onChange,
  appointmentId,
}: Props) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? 'unknown';
  const folder = `${tenantId}/${appointmentId ?? 'temp'}`;

  switch (criterion.type) {
    case 'text':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite sua resposta..."
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
          />
          <span className="text-sm text-muted-foreground">{value === 'true' ? 'Sim' : 'Não'}</span>
        </div>
      );

    case 'choice': {
      const options = criterion.options ?? [];
      return (
        <RadioGroup
          value={isCustomAnswer ? '__other__' : value}
          onValueChange={(v) => {
            if (v === '__other__') {
              onChange('', true);
            } else {
              onChange(v, false);
            }
          }}
        >
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${criterion.id}-${opt}`} />
              <Label htmlFor={`${criterion.id}-${opt}`} className="font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
          {criterion.allowCustomAnswer && (
            <div className="flex items-center gap-2 flex-wrap">
              <RadioGroupItem value="__other__" id={`${criterion.id}-other`} />
              <Label htmlFor={`${criterion.id}-other`} className="font-normal cursor-pointer">
                Outro:
              </Label>
              {isCustomAnswer && (
                <Input
                  className="h-7 text-sm flex-1 min-w-[120px]"
                  value={value}
                  onChange={(e) => onChange(e.target.value, true)}
                  placeholder="Especifique..."
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          )}
        </RadioGroup>
      );
    }

    case 'photo':
      return (
        <ImageUpload
          value={value || null}
          onChange={(url) => onChange(url ?? '')}
          bucket="criteria-photos"
          folder={folder}
          aspectRatio="square"
        />
      );

    default:
      return null;
  }
}
