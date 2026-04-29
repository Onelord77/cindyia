export interface AppointmentSuggestionSlot {
  date: string;
  time: string;
}

export interface AppointmentSuggestion {
  id: string;
  appointmentId: string;
  tenantId: string;
  suggestedSlots: AppointmentSuggestionSlot[];
  observation: string | null;
  createdAt: string;
}

export interface AppointmentSuggestionInput {
  appointmentId: string;
  tenantId: string;
  suggestedSlots: AppointmentSuggestionSlot[];
  observation?: string;
}
