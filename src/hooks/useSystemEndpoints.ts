import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';

export interface SystemEndpoint {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  url_path: string;
  method: string;
  type: string;
  category: string | null;
  expected_params: Record<string, string> | null;
  response_example: Record<string, unknown> | null;
  is_active: boolean;
  requires_auth: boolean;
  created_at: string;
  updated_at: string;
}

export type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'all';
export type EndpointType = 'edge_function' | 'webhook' | 'api' | 'all';

export function useSystemEndpoints() {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<EndpointMethod>('all');
  const [typeFilter, setTypeFilter] = useState<EndpointType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: endpoints, isLoading, error } = useQuery({
    queryKey: ['system-endpoints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_endpoints')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as SystemEndpoint[];
    },
  });

  const categories = useMemo(() => {
    if (!endpoints) return [];
    const cats = [...new Set(endpoints.map(e => e.category).filter(Boolean))];
    return cats.sort() as string[];
  }, [endpoints]);

  // Ordem de prioridade dos métodos HTTP
  const methodOrder: Record<string, number> = {
    'GET': 1,
    'POST': 2,
    'PUT': 3,
    'PATCH': 4,
    'DELETE': 5,
  };

  const filteredEndpoints = useMemo(() => {
    if (!endpoints) return [];

    return endpoints
      .filter(endpoint => {
        // Filtro de busca
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesName = endpoint.display_name.toLowerCase().includes(query);
          const matchesPath = endpoint.url_path.toLowerCase().includes(query);
          const matchesDesc = endpoint.description?.toLowerCase().includes(query);
          if (!matchesName && !matchesPath && !matchesDesc) return false;
        }

        // Filtro de método
        if (methodFilter !== 'all' && endpoint.method !== methodFilter) {
          return false;
        }

        // Filtro de tipo
        if (typeFilter !== 'all' && endpoint.type !== typeFilter) {
          return false;
        }

        // Filtro de categoria
        if (categoryFilter !== 'all' && endpoint.category !== categoryFilter) {
          return false;
        }

        return true;
      })
      // Ordenar por método (GET primeiro, depois POST, etc.) e depois alfabeticamente
      .sort((a, b) => {
        const methodA = methodOrder[a.method] || 99;
        const methodB = methodOrder[b.method] || 99;

        if (methodA !== methodB) {
          return methodA - methodB;
        }

        // Mesmo método: ordenar alfabeticamente por display_name
        return a.display_name.localeCompare(b.display_name, 'pt-BR');
      });
  }, [endpoints, searchQuery, methodFilter, typeFilter, categoryFilter]);

  const stats = useMemo(() => {
    if (!endpoints) return { total: 0, active: 0, byMethod: {} as Record<string, number> };

    const byMethod: Record<string, number> = {};
    endpoints.forEach(e => {
      byMethod[e.method] = (byMethod[e.method] || 0) + 1;
    });

    return {
      total: endpoints.length,
      active: endpoints.filter(e => e.is_active).length,
      byMethod,
    };
  }, [endpoints]);

  return {
    endpoints: filteredEndpoints,
    allEndpoints: endpoints || [],
    isLoading,
    error,
    categories,
    stats,
    // Filters
    searchQuery,
    setSearchQuery,
    methodFilter,
    setMethodFilter,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
  };
}
