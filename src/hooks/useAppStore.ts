import { create } from 'zustand';
import { Appointment, FinancialEntry, Tenant, AppointmentStatus, PaymentStatus } from '@/types';
import { mockAppointments, mockFinancialEntries, mockTenants } from '@/lib/mock-data';

interface AppState {
  // Appointments
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  completeAppointment: (id: string) => void;
  
  // Financial Entries
  financialEntries: FinancialEntry[];
  setFinancialEntries: (entries: FinancialEntry[]) => void;
  addFinancialEntry: (entry: FinancialEntry) => void;
  updateFinancialEntry: (id: string, updates: Partial<FinancialEntry>) => void;
  deleteFinancialEntry: (id: string) => void;
  
  // Tenants (Companies)
  tenants: Tenant[];
  setTenants: (tenants: Tenant[]) => void;
  addTenant: (tenant: Tenant) => void;
  updateTenant: (id: string, updates: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;
  toggleTenantStatus: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Appointments
  appointments: mockAppointments,
  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointment) => set((state) => ({ 
    appointments: [appointment, ...state.appointments] 
  })),
  updateAppointment: (id, updates) => set((state) => ({
    appointments: state.appointments.map(a => 
      a.id === id ? { ...a, ...updates } : a
    )
  })),
  deleteAppointment: (id) => set((state) => ({
    appointments: state.appointments.filter(a => a.id !== id)
  })),
  completeAppointment: (id) => {
    const state = get();
    const appointment = state.appointments.find(a => a.id === id);
    
    if (!appointment) return;
    
    // Check if financial entry already exists for this appointment
    const existingEntry = state.financialEntries.find(
      e => e.appointmentId === id
    );
    
    if (existingEntry) {
      // Just update the appointment status
      set({
        appointments: state.appointments.map(a =>
          a.id === id 
            ? { ...a, status: 'completed' as AppointmentStatus, paymentStatus: 'paid' as PaymentStatus }
            : a
        )
      });
      return;
    }
    
    // Create financial entry for the completed appointment
    const newEntry: FinancialEntry = {
      id: Date.now().toString(),
      tenantId: appointment.tenantId,
      type: 'income',
      category: 'Serviços',
      description: `${appointment.service?.name} - ${appointment.client?.name}`,
      amount: appointment.service?.price || 0,
      date: new Date(),
      appointmentId: id,
      createdAt: new Date(),
    };
    
    set({
      appointments: state.appointments.map(a =>
        a.id === id 
          ? { ...a, status: 'completed' as AppointmentStatus, paymentStatus: 'paid' as PaymentStatus }
          : a
      ),
      financialEntries: [newEntry, ...state.financialEntries],
    });
  },
  
  // Financial Entries
  financialEntries: mockFinancialEntries,
  setFinancialEntries: (entries) => set({ financialEntries: entries }),
  addFinancialEntry: (entry) => set((state) => ({
    financialEntries: [entry, ...state.financialEntries]
  })),
  updateFinancialEntry: (id, updates) => set((state) => ({
    financialEntries: state.financialEntries.map(e =>
      e.id === id ? { ...e, ...updates } : e
    )
  })),
  deleteFinancialEntry: (id) => set((state) => ({
    financialEntries: state.financialEntries.filter(e => e.id !== id)
  })),
  
  // Tenants
  tenants: mockTenants,
  setTenants: (tenants) => set({ tenants }),
  addTenant: (tenant) => set((state) => ({
    tenants: [tenant, ...state.tenants]
  })),
  updateTenant: (id, updates) => set((state) => ({
    tenants: state.tenants.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
  })),
  deleteTenant: (id) => set((state) => ({
    tenants: state.tenants.filter(t => t.id !== id)
  })),
  toggleTenantStatus: (id) => set((state) => ({
    tenants: state.tenants.map(t =>
      t.id === id 
        ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' }
        : t
    )
  })),
}));
