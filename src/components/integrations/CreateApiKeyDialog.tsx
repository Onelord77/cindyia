import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, AlertTriangle, Key } from 'lucide-react';
import { useAgentApiKeys } from '@/hooks/useAgentApiKeys';
import { addDays, addMonths, addYears, format } from 'date-fns';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateApiKeyDialog({ open, onOpenChange }: CreateApiKeyDialogProps) {
  const { createKey, isCreating } = useAgentApiKeys();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expiration, setExpiration] = useState('never');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    let expiresAt: string | null = null;

    if (expiration !== 'never') {
      const now = new Date();
      switch (expiration) {
        case '7days':
          expiresAt = addDays(now, 7).toISOString();
          break;
        case '30days':
          expiresAt = addDays(now, 30).toISOString();
          break;
        case '90days':
          expiresAt = addDays(now, 90).toISOString();
          break;
        case '6months':
          expiresAt = addMonths(now, 6).toISOString();
          break;
        case '1year':
          expiresAt = addYears(now, 1).toISOString();
          break;
      }
    }

    const result = await createKey({
      name,
      description: description || undefined,
      expires_at: expiresAt,
    });

    setGeneratedKey(result.plainKey);
    setStep('success');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('form');
    setName('');
    setDescription('');
    setExpiration('never');
    setGeneratedKey('');
    setCopied(false);
    onOpenChange(false);
  };

  const getExpirationDate = () => {
    if (expiration === 'never') return 'Nunca expira';
    const now = new Date();
    let date: Date;
    switch (expiration) {
      case '7days':
        date = addDays(now, 7);
        break;
      case '30days':
        date = addDays(now, 30);
        break;
      case '90days':
        date = addDays(now, 90);
        break;
      case '6months':
        date = addMonths(now, 6);
        break;
      case '1year':
        date = addYears(now, 1);
        break;
      default:
        return 'Nunca expira';
    }
    return `Expira em ${format(date, 'dd/MM/yyyy')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Nova Chave de API
              </DialogTitle>
              <DialogDescription>
                Crie uma chave para permitir acesso aos endpoints por agentes externos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da chave *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Agente WhatsApp, N8N Integration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Para que será usada esta chave..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Validade</Label>
                <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nunca expira</SelectItem>
                    <SelectItem value="7days">7 dias</SelectItem>
                    <SelectItem value="30days">30 dias</SelectItem>
                    <SelectItem value="90days">90 dias</SelectItem>
                    <SelectItem value="6months">6 meses</SelectItem>
                    <SelectItem value="1year">1 ano</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{getExpirationDate()}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
                {isCreating ? 'Criando...' : 'Criar Chave'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Chave Criada com Sucesso
              </DialogTitle>
              <DialogDescription>
                Copie sua chave agora. Por segurança, ela não será exibida novamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive" className="bg-warning/10 border-warning/30 text-warning-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  <strong>Importante:</strong> Esta é a única vez que você verá esta chave.
                  Guarde-a em um local seguro.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Sua chave de API</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all select-all">
                    {generatedKey}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Como usar:</p>
                <code className="text-xs">
                  curl -H "x-agent-key: {generatedKey.substring(0, 12)}..." ...
                </code>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                {copied ? 'Fechar' : 'Copiei, pode fechar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
