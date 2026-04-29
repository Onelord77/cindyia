import { useServices } from '@/hooks/useServices';
import { CriterionResponseField } from './CriterionResponseField';
import { Loader2 } from 'lucide-react';
import type { ServiceCriterion } from '@/types/criteria';
import type { CriteriaResponsesMap, CriterionResponseEntry } from '@/hooks/useAppointmentCriteria';

interface Props {
  criteria: ServiceCriterion[];
  serviceIds: string[];
  responses: CriteriaResponsesMap;
  onResponsesChange: (responses: CriteriaResponsesMap) => void;
  appointmentId?: string | null;
  isLoading?: boolean;
}

export function AppointmentCriteriaSection({
  criteria,
  serviceIds,
  responses,
  onResponsesChange,
  appointmentId,
  isLoading = false,
}: Props) {
  const { services } = useServices();

  if (serviceIds.length === 0) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando critérios...
      </div>
    );
  }
  if (criteria.length === 0) return null;

  // Group criteria by service
  const grouped = serviceIds.reduce<{ serviceId: string; serviceName: string; criteria: ServiceCriterion[] }[]>(
    (acc, svcId) => {
      const svcCriteria = criteria.filter(c => c.serviceId === svcId);
      if (svcCriteria.length === 0) return acc;
      const svc = services.find(s => s.id === svcId);
      acc.push({ serviceId: svcId, serviceName: svc?.name ?? svcId, criteria: svcCriteria });
      return acc;
    },
    []
  );

  if (grouped.length === 0) return null;

  const handleChange = (criterionId: string, value: string, isCustomAnswer?: boolean) => {
    const next = new Map(responses);
    const entry: CriterionResponseEntry = { value, isCustomAnswer: isCustomAnswer ?? false };
    next.set(criterionId, entry);
    onResponsesChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Informações adicionais</span>
        <span className="text-xs text-muted-foreground">(opcional)</span>
      </div>
      {grouped.map(({ serviceId, serviceName, criteria: svcCriteria }) => (
        <div key={serviceId} className="border rounded-md p-3 space-y-3">
          {grouped.length > 1 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {serviceName}
            </p>
          )}
          {svcCriteria.map((criterion) => {
            const response = responses.get(criterion.id);
            return (
              <div key={criterion.id} className="space-y-1.5">
                <label className="text-sm">
                  {criterion.label}
                  {criterion.isRequired && (
                    <span className="text-destructive ml-1" aria-label="obrigatório">*</span>
                  )}
                </label>
                <CriterionResponseField
                  criterion={criterion}
                  value={response?.value ?? ''}
                  isCustomAnswer={response?.isCustomAnswer ?? false}
                  onChange={(val, isCustom) => handleChange(criterion.id, val, isCustom)}
                  appointmentId={appointmentId}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
