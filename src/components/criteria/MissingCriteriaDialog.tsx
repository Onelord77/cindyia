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
import type { ServiceCriterion } from '@/types/criteria';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingCriteria: ServiceCriterion[];
  onConfirm: () => void;
  actionLabel?: string;
}

export function MissingCriteriaDialog({
  open,
  onOpenChange,
  missingCriteria,
  onConfirm,
  actionLabel = 'Criar mesmo assim',
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Critérios obrigatórios não preenchidos</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Os seguintes critérios estão marcados como obrigatórios:</p>
              <ul className="list-none space-y-1">
                {missingCriteria.map((c) => (
                  <li key={c.id} className="flex items-center gap-1.5 text-sm">
                    <span>•</span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-1">Deseja mesmo prosseguir sem preencher?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
