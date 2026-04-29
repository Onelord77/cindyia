export interface ServiceAIContext {
  id: string;
  serviceId: string;
  tenantId: string;
  description: string;
  indications: string;
  contraindications: string;
  postProcedureCare: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAIContextInput {
  description: string;
  indications: string;
  contraindications: string;
  postProcedureCare: string;
}

export const defaultServiceAIContext: ServiceAIContextInput = {
  description: '',
  indications: '',
  contraindications: '',
  postProcedureCare: '',
};
