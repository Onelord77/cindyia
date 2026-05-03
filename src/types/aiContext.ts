export type AITone = 'formal' | 'amigavel' | 'tecnico' | 'acolhedor';
export type AIPronouns = 'ele' | 'ela' | 'neutro';
export type AIEmojiUsage = 'muito' | 'moderado' | 'nenhum';

export interface TenantAIContext {
  id?: string;
  tenantId?: string;

  // Personalidade
  aiName: string;
  aiTone: AITone;
  aiPronouns: AIPronouns;
  aiEmojiUsage: AIEmojiUsage;

  // Sobre o negócio
  businessIntro: string;
  specialties: string[];
  differentials: string[];
  businessAddress: string;

  // Políticas
  cancellationPolicy: string;
  reschedulingPolicy: string;
  paymentPolicy: string;
  latePolicy: string;

  // Regras éticas
  ethicalRules: string[];

  // Aprendizado de erros
  errorExamples: string;
}

export const defaultAIContext: TenantAIContext = {
  aiName: 'Atendente',
  aiTone: 'amigavel',
  aiPronouns: 'neutro',
  aiEmojiUsage: 'moderado',
  businessIntro: '',
  specialties: [],
  differentials: [],
  businessAddress: '',
  cancellationPolicy: '',
  reschedulingPolicy: '',
  paymentPolicy: '',
  latePolicy: '',
  ethicalRules: [
    'Não dar diagnóstico médico',
    'Não recomendar medicação',
    'Não fazer prognóstico',
  ],
  errorExamples: '',
};
