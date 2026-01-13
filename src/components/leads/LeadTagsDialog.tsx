import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lead, LeadTag } from '@/hooks/useLeads';

interface LeadTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  allTags: LeadTag[];
  leadTags: LeadTag[];
  onAddTag: (leadId: string, tagId: string) => void;
  onRemoveTag: (leadId: string, tagId: string) => void;
  onCreateTag: (name: string, color: string) => void;
}

const defaultColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function LeadTagsDialog({
  open,
  onOpenChange,
  lead,
  allTags,
  leadTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: LeadTagsDialogProps) {
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  if (!lead) return null;

  const leadTagIds = leadTags.map(t => t.id);

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    onCreateTag(newTagName.trim(), selectedColor);
    setNewTagName('');
    setShowNewTagForm(false);
  };

  const handleToggleTag = (tagId: string) => {
    if (leadTagIds.includes(tagId)) {
      onRemoveTag(lead.id, tagId);
    } else {
      onAddTag(lead.id, tagId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tags - {lead.name || lead.whatsapp_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Tags */}
          <div>
            <p className="text-sm font-medium mb-2">Tags do lead:</p>
            <div className="flex flex-wrap gap-2">
              {leadTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tag</p>
              ) : (
                leadTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color || undefined }}
                    onClick={() => onRemoveTag(lead.id, tag.id)}
                  >
                    {tag.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Available Tags */}
          <div>
            <p className="text-sm font-medium mb-2">Tags disponíveis:</p>
            <div className="flex flex-wrap gap-2">
              {allTags.filter(t => !leadTagIds.includes(t.id)).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="gap-1 cursor-pointer hover:opacity-80"
                  style={{ borderColor: tag.color || undefined, color: tag.color || undefined }}
                  onClick={() => onAddTag(lead.id, tag.id)}
                >
                  <Plus className="h-3 w-3" />
                  {tag.name}
                </Badge>
              ))}
              {allTags.filter(t => !leadTagIds.includes(t.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">Todas as tags já aplicadas</p>
              )}
            </div>
          </div>

          {/* Create New Tag */}
          {showNewTagForm ? (
            <div className="space-y-3 rounded-lg border p-3">
              <Input
                placeholder="Nome da tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <div className="flex gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-6 w-6 rounded-full flex items-center justify-center ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-ring' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  Criar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewTagForm(false);
                    setNewTagName('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowNewTagForm(true)}
            >
              <Plus className="h-4 w-4" />
              Criar nova tag
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
