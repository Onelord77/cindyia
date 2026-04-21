export const BUSINESS_TYPES = [
  'Salão de beleza',
  'Barbearia',
  'Estúdio de cílios (lash)',
  'Estúdio de unhas / nail design',
  'Design de sobrancelhas',
  'Clínica de estética',
  'Cabeleireiro',
  'Depilação',
  'Maquiagem',
  'SPA / bem-estar',
  'Outro',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const OTHER_BUSINESS_TYPE = 'Outro';

/**
 * Dado um valor salvo em business_type, retorna:
 * - preset: o item da lista correspondente (se o valor casa exatamente com um preset)
 * - custom: o valor livre quando não casa com nenhum preset (vira "Outro")
 */
export function splitBusinessType(value: string | null | undefined) {
  if (!value) return { preset: '', custom: '' };
  if ((BUSINESS_TYPES as readonly string[]).includes(value)) {
    return { preset: value, custom: '' };
  }
  return { preset: OTHER_BUSINESS_TYPE, custom: value };
}
