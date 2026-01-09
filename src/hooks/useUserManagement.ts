import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'user';
  phone?: string;
}

interface DeleteUserParams {
  userId: string;
}

interface TenantAdmin {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
}

export function useUserManagement() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (params: CreateUserParams) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: params,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-admins', variables.tenantId] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar usuário');
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (params: DeleteUserParams) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: params,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-admins'] });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    },
  });

  return {
    createUser,
    deleteUser,
  };
}

export function useTenantAdmins(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-admins', tenantId],
    queryFn: async (): Promise<TenantAdmin[]> => {
      if (!tenantId) return [];

      // Get all user_ids that have admin role for this tenant
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .eq('tenant_id', tenantId);

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const userIds = adminRoles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: !!tenantId,
  });
}
