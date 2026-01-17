import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { EndpointMethod, EndpointType } from '@/hooks/useSystemEndpoints';

interface EndpointFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  methodFilter: EndpointMethod;
  onMethodChange: (value: EndpointMethod) => void;
  typeFilter: EndpointType;
  onTypeChange: (value: EndpointType) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
}

export function EndpointFilters({
  searchQuery,
  onSearchChange,
  methodFilter,
  onMethodChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
  categories,
}: EndpointFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou URL..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <Select value={methodFilter} onValueChange={(v) => onMethodChange(v as EndpointMethod)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as EndpointType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="edge_function">Edge Function</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="api">API Interna</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
