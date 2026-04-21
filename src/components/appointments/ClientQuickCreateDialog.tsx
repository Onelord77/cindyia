import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UserPlus, Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { formatPhoneMask, unmaskPhone } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientQuickCreateDialogProps {
  onClientCreated: (clientId: string) => void;
}

export function ClientQuickCreateDialog({ onClientCreated }: ClientQuickCreateDialogProps) {
  const { addClient } = useClients();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ddi, setDdi] = useState('55');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const reset = () => {
    setName('');
    setDdi('55');
    setPhone('');
    setEmail('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    const phoneWithDDI = unmaskPhone(phone, ddi);

    try {
      const created = await addClient.mutateAsync({
        name: name.trim(),
        phone: phoneWithDDI,
        email: email.trim() || null,
      });

      if (created?.id) {
        onClientCreated(created.id);
      }
      handleOpenChange(false);
    } catch {
      // toast de erro já vem do hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          title="Cadastrar novo cliente"
          aria-label="Cadastrar novo cliente"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Cadastre um cliente rapidamente. Você pode completar as informações depois na tela de Clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="quick-client-name">Nome completo *</Label>
            <Input
              id="quick-client-name"
              placeholder="Nome do cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-client-phone">Telefone (WhatsApp) *</Label>
            <div className="flex gap-2">
              <Select value={ddi} onValueChange={setDdi}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="DDI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="55">+55</SelectItem>
                  <SelectItem value="1">+1</SelectItem>
                  <SelectItem value="351">+351</SelectItem>
                  <SelectItem value="34">+34</SelectItem>
                  <SelectItem value="33">+33</SelectItem>
                  <SelectItem value="44">+44</SelectItem>
                  <SelectItem value="49">+49</SelectItem>
                  <SelectItem value="39">+39</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="quick-client-phone"
                placeholder="(85) 99766-7750"
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-client-email">E-mail (opcional)</Label>
            <Input
              id="quick-client-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={addClient.isPending}>
            {addClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar e selecionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
