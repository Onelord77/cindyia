import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Server,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const menuItems: SidebarItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Empresas', icon: Building2, href: '/admin/empresas' },
  { label: 'Notificações', icon: Bell, href: '/admin/notificacoes' },
  { label: 'Endpoints', icon: Server, href: '/admin/endpoints' },
  { label: 'Configurações', icon: Shield, href: '/admin/configuracoes' },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function AdminSidebar({ mobile, onNavigate }: AdminSidebarProps = {}) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const handleNavClick = () => {
    if (mobile && onNavigate) {
      onNavigate();
    }
  };

  // Em mobile, nunca fica colapsada
  const isCollapsed = mobile ? false : collapsed;

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar transition-all duration-300 ease-in-out',
        mobile ? 'w-full' : 'fixed left-0 top-0 z-40',
        !mobile && (isCollapsed ? 'w-[70px]' : 'w-[260px]')
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className={cn('flex items-center gap-2 overflow-hidden', isCollapsed && !mobile && 'justify-center')}>
          <img
            src="/assets/images/logo.png"
            alt="Cindy IA"
            className="h-9 w-9 rounded-lg object-cover"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">
                Cindy <span className="text-sidebar-primary">IA</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Admin
              </span>
            </div>
          )}
        </div>
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3" style={{ height: 'calc(100vh - 64px - 80px)' }}>
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px]',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isCollapsed && !mobile && 'justify-center px-2'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'animate-scale-in')} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/70">
              <span className="font-semibold text-sidebar-primary">Super Admin</span> Panel
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
