import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, isLoading, hasRole, isSuperAdmin, mustChangePassword } = useAuth();
  const { isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const location = useLocation();

  if (isLoading || isOnboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Troca de senha obrigatória (primeiro acesso via webhook Ticto)
  if (mustChangePassword && location.pathname !== '/redefinir-senha') {
    return <Navigate to="/redefinir-senha" state={{ firstAccess: true }} replace />;
  }

  // Super admin acessando rota de tenant → redirect para /admin
  if (isSuperAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  // Usuário comum acessando rota de admin → redirect para /
  if (!isSuperAdmin && location.pathname.startsWith('/admin')) {
    return <Navigate to="/" replace />;
  }

  // Onboarding check (skip for super admins)
  if (!isSuperAdmin) {
    if (!isOnboardingComplete && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    if (isOnboardingComplete && location.pathname === '/onboarding') {
      return <Navigate to="/" replace />;
    }
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
