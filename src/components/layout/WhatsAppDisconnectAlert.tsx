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
import { useWhatsappStatus } from '@/hooks/useWhatsappStatus';

const DISMISS_KEY = 'whatsapp-disconnect-popup-dismissed';

export function WhatsAppDisconnectAlert() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasInstances, hasDisconnected, disconnectedNames, isLoading } = useWhatsappStatus();

  useEffect(() => {
    if (isLoading) return;
    if (location.pathname === '/integracoes') return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (!hasInstances) return;

    if (hasDisconnected) {
      setOpen(true);
    }
  }, [isLoading, hasInstances, hasDisconnected, location.pathname]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setOpen(false);
  };

  const handleGoToIntegrations = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setOpen(false);
    navigate('/integracoes');
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleDismiss();
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full p-2 bg-destructive/10">
              <WifiOff className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="flex items-center gap-2">
              <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
              WhatsApp Desconectado
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div>
              {disconnectedNames.length === 1 ? (
                <p>
                  Sua instância <strong>{disconnectedNames[0]}</strong> está desconectada.
                  Enquanto estiver offline, mensagens automáticas não serão enviadas aos clientes.
                </p>
              ) : (
                <p>
                  {disconnectedNames.length} instância(s) estão desconectadas ({disconnectedNames.join(', ')}).
                  Enquanto estiverem offline, mensagens automáticas não serão enviadas aos clientes.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>
            Lembrar depois
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToIntegrations}>
            Reconectar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
