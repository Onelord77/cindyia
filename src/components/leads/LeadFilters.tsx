import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { LeadTag, LeadStatus } from '@/hooks/useLeads';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: LeadStatus | 'all';
  onStatusChange: (value: LeadStatus | 'all') => void;
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  tags: LeadTag[];
  tenantId: string | null;
  onTenantChange: (tenantId: string | null) => void;
  tenants: { id: string; name: string }[];
}

const statusLabels: Record<LeadStatus | 'all', string> = {
  all: 'Todos',
  new: 'Novo',
  in_conversation: 'Em conversa',
  not_scheduled: 'Não agendou',
  scheduled: 'Já agendou',
};

export function LeadFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  selectedTagIds,
  onTagsChange,
  tags,
  tenantId,
  onTenantChange,
  tenants,
}: LeadFiltersProps) {
  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const clearFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onTagsChange([]);
    onTenantChange(null);
  };

  const hasActiveFilters = search || status !== 'all' || selectedTagIds.length > 0 || tenantId;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou número..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tenant Filter */}
      <Select
        value={tenantId || 'all'}
        onValueChange={(value) => onTenantChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estabelecimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos estabelecimentos</SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as LeadStatus | 'all')}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tags Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Tags
            {selectedTagIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {selectedTagIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium">Filtrar por tags</p>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tag criada</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    <Checkbox
                      id={tag.id}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <label
                      htmlFor={tag.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#6366f1' }}
                      />
                      {tag.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
