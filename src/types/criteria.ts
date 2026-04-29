export type CriterionType = 'text' | 'number' | 'choice' | 'boolean' | 'photo';

export const CRITERION_TYPE_LABELS: Record<CriterionType, string> = {
  text: 'Texto livre',
  number: 'Número',
  choice: 'Múltipla escolha',
  boolean: 'Sim ou Não',
  photo: 'Foto',
};

export interface ServiceCriterion {
  id: string;
  serviceId: string;
  tenantId: string;
  label: string;
  type: CriterionType;
  options: string[];
  isRequired: boolean;
  allowCustomAnswer: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CriterionInput {
  label: string;
  type: CriterionType;
  options: string[];
  isRequired: boolean;
  allowCustomAnswer: boolean;
}

export const defaultCriterionInput: CriterionInput = {
  label: '',
  type: 'text',
  options: [],
  isRequired: false,
  allowCustomAnswer: false,
};