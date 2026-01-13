import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface WorkingHours {
  [key: string]: DaySchedule;
}

const DEFAULT_SCHEDULE: DaySchedule = {
  enabled: false,
  start: '09:00',
  end: '18:00',
};

interface WorkingHoursEditorProps {
  value: WorkingHours;
  onChange: (value: WorkingHours) => void;
}

export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  // Ensure all days have a schedule
  const normalizedValue: WorkingHours = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day.key] = value[day.key] || { ...DEFAULT_SCHEDULE };
    return acc;
  }, {} as WorkingHours);

  const toggleDay = (dayKey: string) => {
    const newValue = { ...normalizedValue };
    newValue[dayKey] = {
      ...newValue[dayKey],
      enabled: !newValue[dayKey].enabled,
    };
    onChange(newValue);
  };

  const updateTime = (dayKey: string, field: 'start' | 'end', time: string) => {
    const newValue = { ...normalizedValue };
    newValue[dayKey] = {
      ...newValue[dayKey],
      [field]: time,
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
      <div className="space-y-2 rounded-md border p-3">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = normalizedValue[day.key];
          return (
            <div 
              key={day.key} 
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                schedule.enabled ? 'bg-primary/5' : 'bg-muted/30'
              }`}
            >
              <Switch
                checked={schedule.enabled}
                onCheckedChange={() => toggleDay(day.key)}
                aria-label={`Ativar ${day.label}`}
              />
              <span className={`w-20 text-sm font-medium ${
                schedule.enabled ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {day.label}
              </span>
              {schedule.enabled && (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={schedule.start}
                    onChange={(e) => updateTime(day.key, 'start', e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">até</span>
                  <Input
                    type="time"
                    value={schedule.end}
                    onChange={(e) => updateTime(day.key, 'end', e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                </div>
              )}
              {!schedule.enabled && (
                <span className="text-xs text-muted-foreground italic">Folga</span>
              )}
            </div>
          );
        })}
      </div>
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
