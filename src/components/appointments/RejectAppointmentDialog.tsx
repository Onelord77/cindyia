import { useState } from 'react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useAppointmentRejection } from '@/hooks/useAppointmentRejection';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}

export function RejectAppointmentDialog({ open, onOpenChange, appointmentId }: Props) {
  const [reason, setReason] = useState('');
  const { rejectAppointment } = useAppointmentRejection();

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    await rejectAppointment.mutateAsync({ appointmentId, reason: reason.trim() });
    if (!rejectAppointment.isError) {
      handleClose();
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeitar agendamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Informe o motivo da rejeição. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="reject-reason">Motivo <span className="text-destructive">*</span></Label>
          <Textarea
            id="reject-reason"
            placeholder="Ex: Profissional indisponível nesta data, serviço fora do nosso escopo, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || rejectAppointment.isPending}
          >
            {rejectAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rejeitar agendamento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
