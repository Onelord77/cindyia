import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay, format, subDays } from 'date-fns';

interface ReportAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  price: number;
  duration: number;
  services?: { id: string; name: string; price: number } | null;
  employees?: { id: string; name: string } | null;
  clients?: { id: string; name: string } | null;
  appointment_services?: { services?: { name: string } | null; employees?: { name: string } | null }[];
}

interface FinancialEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category: string;
  description: string | null;
}

export function useReportData(dateRange?: DateRange) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Define date range for query (default: last 90 days)
  const queryDateRange = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return {
        from: startOfDay(dateRange.from).toISOString(),
        to: endOfDay(dateRange.to).toISOString(),
      };
    }
    // Default: last 90 days
    const ninetyDaysAgo = subDays(new Date(), 90);
    return {
      from: startOfDay(ninetyDaysAgo).toISOString(),
      to: endOfDay(new Date()).toISOString(),
    };
  }, [dateRange]);

  // Fetch appointments for reports (no 30-day limit)
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['report-appointments', tenantId, queryDateRange.from, queryDateRange.to],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          status,
          price,
          duration,
          services (id, name, price),
          employees (id, name),
          clients (id, name),
          appointment_services (services:service_id (name), employees:employee_id (name))
        `)
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', queryDateRange.from)
        .lte('scheduled_at', queryDateRange.to)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as ReportAppointment[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch financial entries for reports
  const { data: financialEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['report-financial', tenantId, queryDateRange.from, queryDateRange.to],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('financial_entries')
        .select('id, type, amount, date, category, description')
        .eq('tenant_id', tenantId)
        .gte('date', queryDateRange.from.split('T')[0])
        .lte('date', queryDateRange.to.split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data as FinancialEntry[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process data for reports
  const processedData = useMemo(() => {
    // Filter by exact date range if provided
    const filteredAppointments = dateRange?.from && dateRange?.to
      ? appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.scheduled_at);
          return isWithinInterval(appointmentDate, {
            start: startOfDay(dateRange.from!),
            end: endOfDay(dateRange.to!),
          });
        })
      : appointments;

    const filteredEntries = dateRange?.from && dateRange?.to
      ? financialEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return isWithinInterval(entryDate, {
            start: startOfDay(dateRange.from!),
            end: endOfDay(dateRange.to!),
          });
        })
      : financialEntries;

    // Calculate KPIs
    const totalRevenue = filteredEntries
      .filter(e => e.type === 'income')
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const totalExpenses = filteredEntries
      .filter(e => e.type === 'expense')
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const totalAppointments = filteredAppointments.length;
    const completedAppointments = filteredAppointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = filteredAppointments.filter(a => a.status === 'cancelled').length;
    const ticketMedio = completedAppointments > 0 ? totalRevenue / completedAppointments : 0;
    const cancelRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

    // Group revenue/expenses by day
    const revenueByDay: Record<string, { receita: number; despesa: number }> = {};
    filteredEntries.forEach(entry => {
      const dayKey = format(new Date(entry.date), 'dd/MM');
      if (!revenueByDay[dayKey]) {
        revenueByDay[dayKey] = { receita: 0, despesa: 0 };
      }
      if (entry.type === 'income') {
        revenueByDay[dayKey].receita += Number(entry.amount);
      } else {
        revenueByDay[dayKey].despesa += Number(entry.amount);
      }
    });

    // Sort by date and get last 14 days of data
    const sortedDays = Object.entries(revenueByDay)
      .sort((a, b) => {
        const dateA = a[0].split('/').reverse().join('-');
        const dateB = b[0].split('/').reverse().join('-');
        return dateA.localeCompare(dateB);
      })
      .slice(-14);

    const dailyData = sortedDays.map(([name, values]) => ({ name, ...values }));

    // Group by service (supports multiple services per appointment)
    const serviceCount: Record<string, number> = {};
    filteredAppointments.forEach(appointment => {
      if (appointment.appointment_services && appointment.appointment_services.length > 0) {
        appointment.appointment_services.forEach(as => {
          const svcName = as.services?.name || 'Outros';
          serviceCount[svcName] = (serviceCount[svcName] || 0) + 1;
        });
      } else {
        const serviceName = appointment.services?.name || 'Outros';
        serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
      }
    });

    const colors = [
      'hsl(340, 65%, 55%)',
      'hsl(340, 55%, 60%)',
      'hsl(340, 45%, 65%)',
      'hsl(340, 35%, 70%)',
      'hsl(340, 25%, 75%)',
    ];

    const serviceData = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index] || colors[colors.length - 1],
      }));

    // Group by weekday
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    filteredAppointments.forEach(appointment => {
      const day = new Date(appointment.scheduled_at).getDay();
      weekdayCount[day]++;
    });

    const weekdayData = weekdayNames.map((name, index) => ({
      name,
      agendamentos: weekdayCount[index],
    }));

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    filteredEntries
      .filter(e => e.type === 'expense')
      .forEach(entry => {
        const category = entry.category || 'Outros';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(entry.amount);
      });

    const expenseCategoryData = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Group income by category
    const incomeByCategory: Record<string, number> = {};
    filteredEntries
      .filter(e => e.type === 'income')
      .forEach(entry => {
        const category = entry.category || 'Outros';
        incomeByCategory[category] = (incomeByCategory[category] || 0) + Number(entry.amount);
      });

    const incomeCategoryData = Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return {
      totalRevenue,
      totalExpenses,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      ticketMedio,
      cancelRate,
      dailyData,
      serviceData,
      weekdayData,
      expenseCategoryData,
      incomeCategoryData,
      appointments: filteredAppointments,
      financialEntries: filteredEntries,
    };
  }, [appointments, financialEntries, dateRange]);

  return {
    ...processedData,
    isLoading: appointmentsLoading || entriesLoading,
  };
}
