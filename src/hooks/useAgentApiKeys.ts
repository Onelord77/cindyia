import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AgentApiKey {
  id: string;
  tenant_id: string | null;
  name: string;
  key_prefix: string;
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateApiKeyData {
  name: string;
  description?: string;
  expires_at?: string | null;
}

// Gera uma chave aleatória segura usando crypto.getRandomValues()
function generateApiKey(): string {
  const prefix = 'cky_';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, 'x')
    .replace(/\//g, 'y')
    .replace(/=/g, '');
  return prefix + base64.substring(0, 32);
}

// Gera hash SHA-256 da chave
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAgentApiKeys() {
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  // Super admin vê todas as chaves de sistema (tenant_id IS NULL)
  // Admin de tenant vê apenas chaves do seu tenant
  const queryKey = isSuperAdmin ? ['agent-api-keys', 'system'] : ['agent-api-keys', tenantId];

  // Busca chaves de API
  const { data: apiKeys, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('agent_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (isSuperAdmin) {
        // Super admin: busca chaves de sistema (sem tenant)
        query = query.is('tenant_id', null);
      } else if (tenantId) {
        // Admin de tenant: busca chaves do tenant
        query = query.eq('tenant_id', tenantId);
      } else {
        // Sem tenant e não é super admin
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentApiKey[];
    },
    enabled: !!user && (isSuperAdmin || !!tenantId),
  });

  // Cria uma nova chave
  const createKeyMutation = useMutation({
    mutationFn: async (data: CreateApiKeyData): Promise<{ key: AgentApiKey; plainKey: string }> => {
      if (!user) throw new Error('Não autenticado');
      if (!isSuperAdmin && !tenantId) throw new Error('Tenant não encontrado');

      // Gera a chave e seu hash
      const plainKey = generateApiKey();
      const keyHash = await hashKey(plainKey);
      const keyPrefix = plainKey.substring(0, 8);

      const { data: newKey, error } = await supabase
        .from('agent_api_keys')
        .insert({
          tenant_id: isSuperAdmin ? null : tenantId, // null para chaves de sistema
          name: data.name,
          description: data.description || null,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          expires_at: data.expires_at || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { key: newKey as AgentApiKey, plainKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Chave de API criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar chave: ${error.message}`);
    },
  });

  // Atualiza uma chave
  const updateKeyMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AgentApiKey> & { id: string }) => {
      const { data: updatedKey, error } = await supabase
        .from('agent_api_keys')
        .update({
          name: data.name,
          description: data.description,
          is_active: data.is_active,
          expires_at: data.expires_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedKey as AgentApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Chave atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar chave: ${error.message}`);
    },
  });

  // Deleta uma chave
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Chave excluída com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir chave: ${error.message}`);
    },
  });

  // Toggle ativo/inativo
  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('agent_api_keys')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(variables.is_active ? 'Chave ativada' : 'Chave desativada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  return {
    apiKeys: apiKeys || [],
    isLoading,
    error,
    createKey: createKeyMutation.mutateAsync,
    isCreating: createKeyMutation.isPending,
    updateKey: updateKeyMutation.mutateAsync,
    isUpdating: updateKeyMutation.isPending,
    deleteKey: deleteKeyMutation.mutateAsync,
    isDeleting: deleteKeyMutation.isPending,
    toggleKey: toggleKeyMutation.mutateAsync,
    isToggling: toggleKeyMutation.isPending,
  };
}
