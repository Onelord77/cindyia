import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

export interface BreakPeriod {
  id: string;
  start: string;
  end: string;
  label?: string;
}

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface WorkingHours {
  [key: string]: DaySchedule;
}

export interface BreaksConfig {
  breaks: BreakPeriod[];
}

// Interface para horários da empresa (opcional)
export interface CompanyHours {
  openTime: string;
  closeTime: string;
  workingDays: string[];
}

const DEFAULT_SCHEDULE: DaySchedule = {
  enabled: false,
  start: '09:00',
  end: '18:00',
};

interface WorkingHoursEditorProps {
  value: WorkingHours;
  onChange: (value: WorkingHours) => void;
  // Nova prop opcional - quando passada, restringe os horários
  companyHours?: CompanyHours;
}

export function WorkingHoursEditor({ value, onChange, companyHours }: WorkingHoursEditorProps) {
  // Ensure all days have a schedule
  const normalizedValue: WorkingHours = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day.key] = value[day.key] || { ...DEFAULT_SCHEDULE };
    return acc;
  }, {} as WorkingHours);

  // Verifica se um dia está disponível baseado no horário da empresa
  const isDayAvailable = (dayKey: string): boolean => {
    if (!companyHours) return true;
    return companyHours.workingDays.includes(dayKey);
  };

  // Ajusta o horário para ficar dentro dos limites da empresa
  const clampTime = (time: string, field: 'start' | 'end'): string => {
    if (!companyHours) return time;
    
    const [h, m] = time.split(':').map(Number);
    const [openH, openM] = companyHours.openTime.split(':').map(Number);
    const [closeH, closeM] = companyHours.closeTime.split(':').map(Number);
    
    const timeMins = h * 60 + m;
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    
    if (field === 'start' && timeMins < openMins) {
      return companyHours.openTime;
    }
    if (field === 'end' && timeMins > closeMins) {
      return companyHours.closeTime;
    }
    
    return time;
  };

  const toggleDay = (dayKey: string) => {
    // Não permite ativar dia se empresa está fechada
    if (!isDayAvailable(dayKey) && !normalizedValue[dayKey].enabled) {
      return;
    }
    
    const newValue = { ...normalizedValue };
    const willEnable = !newValue[dayKey].enabled;
    
    // Se está habilitando, ajusta horários para limites da empresa
    if (willEnable && companyHours) {
      newValue[dayKey] = {
        enabled: true,
        start: companyHours.openTime,
        end: companyHours.closeTime,
      };
    } else {
      newValue[dayKey] = {
        ...newValue[dayKey],
        enabled: willEnable,
      };
    }
    onChange(newValue);
  };

  const updateTime = (dayKey: string, field: 'start' | 'end', time: string) => {
    const clampedTime = clampTime(time, field);
    const newValue = { ...normalizedValue };
    newValue[dayKey] = {
      ...newValue[dayKey],
      [field]: clampedTime,
    };
    onChange(newValue);
  };

  const enabledDaysCount = Object.values(normalizedValue).filter(d => d.enabled).length;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Horário de Trabalho
      </Label>
      <p className="text-xs text-muted-foreground">
        {enabledDaysCount} dia(s) de trabalho configurado(s)
      </p>
      
      {/* Banner informativo quando há restrição da empresa */}
      {companyHours && (
        <Alert className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Horário da empresa: {companyHours.openTime} - {companyHours.closeTime} • 
            Dias: {companyHours.workingDays.length === 7 
              ? 'Todos' 
              : companyHours.workingDays.map(d => 
                  DAYS_OF_WEEK.find(day => day.key === d)?.label.slice(0, 3)
                ).join(', ')
            }
          </AlertDescription>
        </Alert>
      )}
      
      <ScrollArea className="h-[280px] rounded-md border">
        <div className="space-y-2 p-3">
          {DAYS_OF_WEEK.map((day) => {
            const schedule = normalizedValue[day.key];
            const dayAvailable = isDayAvailable(day.key);
            const isDisabledByCompany = !dayAvailable;
            
            return (
              <div 
                key={day.key} 
                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                  isDisabledByCompany 
                    ? 'bg-muted/50 opacity-60' 
                    : schedule.enabled 
                      ? 'bg-primary/5' 
                      : 'bg-muted/30'
                }`}
              >
                <Switch
                  checked={schedule.enabled && dayAvailable}
                  onCheckedChange={() => toggleDay(day.key)}
                  disabled={isDisabledByCompany}
                  aria-label={`Ativar ${day.label}`}
                />
                <span className={`w-20 text-sm font-medium ${
                  isDisabledByCompany 
                    ? 'text-muted-foreground line-through'
                    : schedule.enabled 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                }`}>
                  {day.label}
                </span>
                {schedule.enabled && dayAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={schedule.start}
                      onChange={(e) => updateTime(day.key, 'start', e.target.value)}
                      min={companyHours?.openTime}
                      max={companyHours?.closeTime}
                      className="w-28 h-8 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="time"
                      value={schedule.end}
                      onChange={(e) => updateTime(day.key, 'end', e.target.value)}
                      min={companyHours?.openTime}
                      max={companyHours?.closeTime}
                      className="w-28 h-8 text-sm"
                    />
                  </div>
                )}
                {!schedule.enabled && !isDisabledByCompany && (
                  <span className="text-xs text-muted-foreground italic">Folga</span>
                )}
                {isDisabledByCompany && (
                  <span className="text-xs text-muted-foreground italic">Empresa fechada</span>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function formatWorkingHoursSummary(workingHours: WorkingHours | null | undefined): string {
  if (!workingHours) return 'Não configurado';
  
  const enabledDays = DAYS_OF_WEEK.filter(day => workingHours[day.key]?.enabled);
  
  if (enabledDays.length === 0) return 'Sem horários definidos';
  if (enabledDays.length === 7) return 'Todos os dias';
  if (enabledDays.length >= 5) {
    const weekdays = ['seg', 'ter', 'qua', 'qui', 'sex'];
    const hasAllWeekdays = weekdays.every(d => workingHours[d]?.enabled);
    if (hasAllWeekdays && enabledDays.length === 5) return 'Seg a Sex';
    if (hasAllWeekdays && workingHours['sab']?.enabled) return 'Seg a Sáb';
  }
  
  return enabledDays.map(d => d.label.slice(0, 3)).join(', ');
}

export { DAYS_OF_WEEK };
