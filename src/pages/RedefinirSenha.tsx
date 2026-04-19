import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1) Verifica se a URL já traz um erro do Supabase (token expirado, consumido, etc.)
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
    const pkceCode = queryParams.get('code');
    const hasTokenInHash = hashParams.has('access_token') || hashParams.get('type') === 'recovery';

    if (errorCode || errorDesc) {
      const friendly =
        errorCode === 'otp_expired'
          ? 'O link expirou. Solicite um novo.'
          : errorCode === 'access_denied'
          ? 'Este link já foi usado ou é inválido.'
          : decodeURIComponent(errorDesc || 'Link inválido ou expirado.');
      setErrorMessage(friendly);
      setHasRecoverySession(false);
      return;
    }

    // 2) Escuta o evento oficial de recovery
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(true);
      } else if (event === 'SIGNED_IN' && session) {
        setHasRecoverySession((prev) => prev ?? true);
      }
    });

    // 3) Se a URL indica que há processamento em andamento, espera o evento indefinidamente.
    //    Só declaramos "link inválido" se não houver NENHUM indício de recovery na URL.
    const recoveryInProgress = hasTokenInHash || !!pkceCode;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasRecoverySession((prev) => prev ?? true);
      } else if (!recoveryInProgress) {
        setHasRecoverySession(false);
      }
      // se recoveryInProgress === true e ainda não há sessão, mantém loading até o evento chegar
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      console.error('Update password error:', error);
      toast.error('Não foi possível atualizar a senha. Tente novamente.');
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 2500);
  };

  if (hasRecoverySession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src="/assets/images/logo.png" alt="Cindy IA" className="h-12 w-12 rounded-lg" />
          </div>
          <div>
            <CardTitle className="text-2xl">Redefinir senha</CardTitle>
            <CardDescription className="mt-2">
              Crie uma nova senha para acessar sua conta.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!hasRecoverySession ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Link inválido ou expirado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage || 'O link de redefinição pode ter expirado ou já ter sido usado. Solicite um novo.'}
                </p>
              </div>
              <Button asChild className="w-full min-h-[44px]">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full min-h-[44px]">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-success/10 p-3">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Senha atualizada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você será redirecionado para o login em instantes...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 min-h-[44px]"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 min-h-[44px]"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedefinirSenha;
