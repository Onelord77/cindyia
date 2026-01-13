import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Tag, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Lead, LeadStatus, LeadTag } from '@/hooks/useLeads';

interface LeadTableProps {
  leads: (Lead & { tags?: LeadTag[] })[];
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  onEditTags: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
}

const statusLabels: Record<LeadStatus, string> = {
  new: 'Novo',
  in_conversation: 'Em conversa',
  not_scheduled: 'Não agendou',
  scheduled: 'Já agendou',
};

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-info/10 text-info border-info/20',
  in_conversation: 'bg-primary/10 text-primary border-primary/20',
  not_scheduled: 'bg-warning/10 text-warning border-warning/20',
  scheduled: 'bg-success/10 text-success border-success/20',
};

export function LeadTable({
  leads,
  selectedIds,
  onSelectChange,
  onEditTags,
  onViewDetails,
}: LeadTableProps) {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < leads.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(leads.map((l) => l.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  const formatPhone = (phone: string) => {
    // Format as (XX) XXXXX-XXXX if Brazilian number
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      const ddd = cleaned.slice(2, 4);
      const part1 = cleaned.slice(4, 9);
      const part2 = cleaned.slice(9);
      return `(${ddd}) ${part1}-${part2}`;
    }
    return phone;
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as HTMLButtonElement).dataset.state = someSelected ? 'indeterminate' : (allSelected ? 'checked' : 'unchecked');
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Estabelecimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Última Interação</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Nenhum lead encontrado
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(lead.id)}
                    onCheckedChange={() => handleSelectOne(lead.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {lead.name || <span className="text-muted-foreground italic">Sem nome</span>}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatPhone(lead.whatsapp_number)}
                </TableCell>
                <TableCell>
                  {lead.tenant?.name || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[lead.status]}>
                    {statusLabels[lead.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {lead.tags && lead.tags.length > 0 ? (
                      lead.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color || undefined }}
                        >
                          {tag.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                    {lead.tags && lead.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{lead.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(lead.last_message_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(lead)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditTags(lead)}>
                        <Tag className="mr-2 h-4 w-4" />
                        Editar tags
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
