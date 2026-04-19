import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Informe seu e-mail');
      return;
    }

    setIsLoading(true);
    const redirectTo = `${window.location.origin}/redefinir-senha`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setIsLoading(false);

    if (error) {
      console.error('Reset password error:', error);
      toast.error('Não foi possível enviar o e-mail. Tente novamente.');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src="/assets/images/logo.png" alt="Cindy IA" className="h-12 w-12 rounded-lg" />
          </div>
          <div>
            <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
            <CardDescription className="mt-2">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-success/10 p-3">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">E-mail enviado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá em instantes um link
                  para redefinir sua senha. Verifique também a caixa de spam.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full min-h-[44px]">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 min-h-[44px]"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link de redefinição
              </Button>
              <Button asChild variant="ghost" className="w-full min-h-[44px]">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EsqueciSenha;
