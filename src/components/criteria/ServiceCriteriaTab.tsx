import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useServiceCriteria } from '@/hooks/useServiceCriteria';
import { CriterionEditor } from './CriterionEditor';
import { CRITERION_TYPE_LABELS, type CriterionInput } from '@/types/criteria';
import type { ServiceCriterion } from '@/types/criteria';

interface ServiceCriteriaTabProps {
  serviceId: string;
}

export function ServiceCriteriaTab({ serviceId }: ServiceCriteriaTabProps) {
  const {
    criteria,
    isLoading,
    createCriterion,
    updateCriterion,
    deleteCriterion,
    reorderCriteria,
  } = useServiceCriteria(serviceId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<ServiceCriterion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingCriterion(null);
    setEditorOpen(true);
  };

  const openEdit = (c: ServiceCriterion) => {
    setEditingCriterion(c);
    setEditorOpen(true);
  };

  const handleSave = async (input: CriterionInput) => {
    if (editingCriterion) {
      await updateCriterion.mutateAsync({ id: editingCriterion.id, input });
    } else {
      await createCriterion.mutateAsync({ serviceId, input });
    }
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCriterion.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const items = [...criteria];
    const updated = [
      ...items.slice(0, index - 1),
      { ...items[index], displayOrder: items[index - 1].displayOrder },
      { ...items[index - 1], displayOrder: items[index].displayOrder },
      ...items.slice(index + 1),
    ];
    await reorderCriteria.mutateAsync(
      updated.map(c => ({ id: c.id, display_order: c.displayOrder }))
    );
  };

  const moveDown = async (index: number) => {
    if (index === criteria.length - 1) return;
    const items = [...criteria];
    const updated = [
      ...items.slice(0, index),
      { ...items[index + 1], displayOrder: items[index].displayOrder },
      { ...items[index], displayOrder: items[index + 1].displayOrder },
      ...items.slice(index + 2),
    ];
    await reorderCriteria.mutateAsync(
      updated.map(c => ({ id: c.id, display_order: c.displayOrder }))
    );
  };

  const isSaving =
    createCriterion.isPending || updateCriterion.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">Critérios de Agendamento</h3>
          <p className="text-sm text-muted-foreground">
            Perguntas que o cliente responde ao agendar este serviço
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1 shrink-0">
          <Plus className="h-4 w-4" />
          Adicionar Critério
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : criteria.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum critério cadastrado. Clique em "Adicionar Critério" para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {criteria.map((c, index) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border bg-card p-3"
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || reorderCriteria.isPending}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveDown(index)}
                  disabled={index === criteria.length - 1 || reorderCriteria.isPending}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{c.label}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {CRITERION_TYPE_LABELS[c.type]}
                </Badge>
                {c.isRequired && (
                  <Badge variant="outline" className="text-xs border-destructive/50 text-destructive shrink-0">
                    <span className="mr-0.5">*</span> Obrigatório
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(c)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingId(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CriterionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editingCriterion}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir critério?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O critério será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
