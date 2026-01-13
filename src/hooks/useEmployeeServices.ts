import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmployeeService {
  id: string;
  employee_id: string;
  service_id: string;
  created_at: string;
}

interface ServiceWithDetails {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export function useEmployeeServices(employeeId?: string) {
  const queryClient = useQueryClient();

  // Fetch services linked to a specific employee
  const { data: employeeServices = [], isLoading, error } = useQuery({
    queryKey: ['employee-services', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('employee_services')
        .select(`
          id,
          employee_id,
          service_id,
          created_at,
          services:service_id (
            id,
            name,
            duration,
            price
          )
        `)
        .eq('employee_id', employeeId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  // Get just the service IDs for easier manipulation
  const linkedServiceIds = employeeServices.map(es => es.service_id);

  // Update all services for an employee (replace operation)
  const updateEmployeeServices = useMutation({
    mutationFn: async ({ employeeId, serviceIds }: { employeeId: string; serviceIds: string[] }) => {
      // First, delete all existing links
      const { error: deleteError } = await supabase
        .from('employee_services')
        .delete()
        .eq('employee_id', employeeId);

      if (deleteError) throw deleteError;

      // Then insert new links
      if (serviceIds.length > 0) {
        const inserts = serviceIds.map(serviceId => ({
          employee_id: employeeId,
          service_id: serviceId,
        }));

        const { error: insertError } = await supabase
          .from('employee_services')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      return serviceIds;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-services', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-services-bulk'] });
      toast.success('Serviços do funcionário atualizados!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar serviços: ' + error.message);
    },
  });

  // Add a single service to an employee
  const addServiceToEmployee = useMutation({
    mutationFn: async ({ employeeId, serviceId }: { employeeId: string; serviceId: string }) => {
      const { data, error } = await supabase
        .from('employee_services')
        .insert({ employee_id: employeeId, service_id: serviceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-services', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-services-bulk'] });
    },
    onError: (error) => {
      toast.error('Erro ao vincular serviço: ' + error.message);
    },
  });

  // Remove a single service from an employee
  const removeServiceFromEmployee = useMutation({
    mutationFn: async ({ employeeId, serviceId }: { employeeId: string; serviceId: string }) => {
      const { error } = await supabase
        .from('employee_services')
        .delete()
        .eq('employee_id', employeeId)
        .eq('service_id', serviceId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-services', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-services-bulk'] });
    },
    onError: (error) => {
      toast.error('Erro ao desvincular serviço: ' + error.message);
    },
  });

  return {
    employeeServices,
    linkedServiceIds,
    isLoading,
    error,
    updateEmployeeServices,
    addServiceToEmployee,
    removeServiceFromEmployee,
  };
}

// Hook to fetch services for multiple employees at once
export function useEmployeeServicesBulk(employeeIds: string[]) {
  return useQuery({
    queryKey: ['employee-services-bulk', employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return {};

      const { data, error } = await supabase
        .from('employee_services')
        .select(`
          id,
          employee_id,
          service_id,
          services:service_id (
            id,
            name,
            duration,
            price
          )
        `)
        .in('employee_id', employeeIds);

      if (error) throw error;

      // Group by employee_id
      const grouped: Record<string, Array<{ serviceId: string; service: ServiceWithDetails }>> = {};
      for (const item of data || []) {
        if (!grouped[item.employee_id]) {
          grouped[item.employee_id] = [];
        }
        grouped[item.employee_id].push({
          serviceId: item.service_id,
          service: item.services as unknown as ServiceWithDetails,
        });
      }

      return grouped;
    },
    enabled: employeeIds.length > 0,
  });
}
