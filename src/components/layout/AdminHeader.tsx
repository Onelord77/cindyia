import { Settings, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme';

interface AdminHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function AdminHeader({ onMenuClick, showMenuButton }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const userName = profile?.full_name || 'Super Admin';

  const handleSettings = () => {
    navigate('/admin/configuracoes');
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side */}
      <div className="flex items-center gap-2">
        {/* Mobile menu button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="min-h-[44px] min-w-[44px]"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        )}

        {/* Panel name */}
        <p className="font-medium text-sm">Painel Admin</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 sm:gap-3 px-2 min-h-[44px]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Super Admin
                </Badge>
              </div>
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSettings} className="min-h-[44px] cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive min-h-[44px] cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
