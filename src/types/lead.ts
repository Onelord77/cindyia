export type LeadColumnKey =
  | 'novo'
  | 'em_conversa'
  | 'aguardando_resposta'
  | 'em_negociacao'
  | 'convertido'
  | 'perdido';

export const DEFAULT_COLUMN_LABELS: Record<LeadColumnKey, string> = {
  novo: 'Novo',
  em_conversa: 'Em conversa',
  aguardando_resposta: 'Aguardando resposta',
  em_negociacao: 'Em negociação',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

export const COLUMN_KEYS_ORDER: LeadColumnKey[] = [
  'novo',
  'em_conversa',
  'aguardando_resposta',
  'em_negociacao',
  'convertido',
  'perdido',
];

export const COLUMN_ACCENT: Record<LeadColumnKey, string> = {
  novo: 'bg-blue-500',
  em_conversa: 'bg-purple-500',
  aguardando_resposta: 'bg-yellow-500',
  em_negociacao: 'bg-orange-500',
  convertido: 'bg-green-500',
  perdido: 'bg-red-400',
};
