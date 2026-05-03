import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail?: string;
}

export function AccountDialog({ open, onOpenChange, currentEmail }: AccountDialogProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateEmail = async () => {
    if (!email.trim()) return toast.error('Informe um e-mail válido');
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setEmailLoading(false);
    if (error) return toast.error('Erro ao atualizar e-mail: ' + error.message);
    toast.success('Confirmação enviada! Verifique sua caixa de entrada.');
    onOpenChange(false);
  };

  const handleUpdatePassword = async () => {
    if (password.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres');
    if (password !== confirmPassword) return toast.error('As senhas não coincidem');
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordLoading(false);
    if (error) return toast.error('Erro ao atualizar senha: ' + error.message);
    toast.success('Senha atualizada com sucesso!');
    setPassword('');
    setConfirmPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Minha Conta</DialogTitle>
          <DialogDescription>Atualize seu e-mail ou senha de acesso</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="email">
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1">E-mail</TabsTrigger>
            <TabsTrigger value="password" className="flex-1">Senha</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Novo e-mail</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="novo@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Um e-mail de confirmação será enviado para o novo endereço.
              </p>
            </div>
            <Button onClick={handleUpdateEmail} disabled={emailLoading} className="w-full">
              {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar E-mail
            </Button>
          </TabsContent>

          <TabsContent value="password" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button onClick={handleUpdatePassword} disabled={passwordLoading} className="w-full">
              {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Senha
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
