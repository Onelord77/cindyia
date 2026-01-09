// AgendAI - Type Definitions

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  plan: 'basic' | 'pro' | 'enterprise';
  createdAt: Date;
  employeeCount: number;
  appointmentCount: number;
}

export interface Employee {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: 'admin' | 'employee';
  services: string[];
  workSchedule: WorkSchedule[];
  isActive: boolean;
  createdAt: Date;
}

export interface WorkSchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isActive: boolean;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price: number;
  isActive: boolean;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  lastVisit?: Date;
  totalAppointments: number;
}

export interface Appointment {
  id: string;
  tenantId: string;
  clientId: string;
  client?: Client;
  employeeId: string;
  employee?: Employee;
  serviceId: string;
  service?: Service;
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: Date;
  createdBy: 'whatsapp' | 'manual';
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'no_charge';

export interface FinancialEntry {
  id: string;
  tenantId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: Date;
  appointmentId?: string;
  createdAt: Date;
}

export interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  completedToday: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  topServices: { name: string; count: number }[];
  appointmentsByStatus: { status: AppointmentStatus; count: number }[];
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  companyName: string;
  address?: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  cancellationPolicy: {
    allowCancellation: boolean;
    minHoursBeforeCancel: number;
  };
  workingDays: number[];
  openTime: string;
  closeTime: string;
}

export type UserRole = 'super_admin' | 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  avatar?: string;
}
