import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { WifiOff } from 'lucide-react';
import { useAdminWhatsappStatus } from '@/hooks/useAdminWhatsappStatus';

const DISMISS_KEY = 'admin-whatsapp-disconnect-dismissed';

export function AdminWhatsAppDisconnectAlert() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasDisconnected, disconnectedInstances, tenantsWithIssues, isLoading } =
    useAdminWhatsappStatus();

  useEffect(() => {
    if (isLoading) return;
    if (location.pathname === '/admin/whatsapp-instances') return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (hasDisconnected) setOpen(true);
  }, [isLoading, hasDisconnected, location.pathname]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setOpen(false);
  };

  const handleGoToManage = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setOpen(false);
    navigate('/admin/whatsapp-instances');
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleDismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full p-2 bg-destructive/10">
              <WifiOff className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="flex items-center gap-2">
              <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
              Instâncias WhatsApp Desconectadas
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                <strong>{disconnectedInstances.length}</strong> instância(s) de{' '}
                <strong>{tenantsWithIssues.length}</strong> empresa(s) estão desconectadas no
                momento. Os clientes podem precisar reescanear o QR Code.
              </p>
              <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs">
                {disconnectedInstances.slice(0, 10).map((inst) => (
                  <div key={inst.id} className="flex justify-between gap-2 py-0.5">
                    <span className="font-medium truncate">{inst.tenant_name}</span>
                    <span className="text-muted-foreground truncate">{inst.instance_name}</span>
                  </div>
                ))}
                {disconnectedInstances.length > 10 && (
                  <p className="pt-1 text-muted-foreground">
                    + {disconnectedInstances.length - 10} outra(s)…
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Lembrar depois</AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToManage}>Gerenciar instâncias</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
