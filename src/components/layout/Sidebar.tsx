import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  UserCog,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plug,
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
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Agendamentos', icon: CalendarCheck, href: '/agendamentos' },
  { label: 'Clientes', icon: Users, href: '/clientes' },
  { label: 'Equipe', icon: UserCog, href: '/funcionarios' },
  { label: 'Serviços', icon: Sparkles, href: '/servicos' },
  { label: 'Financeiro', icon: DollarSign, href: '/financeiro' },
  { label: 'Relatórios', icon: BarChart3, href: '/relatorios' },
  { label: 'Notificações', icon: Bell, href: '/notificacoes' },
  { label: 'Integrações', icon: Plug, href: '/integracoes' },
  { label: 'Configurações', icon: Settings, href: '/configuracoes' },
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ mobile, onNavigate, collapsed: collapsedProp, onCollapsedChange }: SidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const location = useLocation();

  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;

  const handleToggleCollapse = () => {
    const next = !collapsed;
    if (onCollapsedChange) {
      onCollapsedChange(next);
    } else {
      setInternalCollapsed(next);
    }
  };

  const handleNavClick = () => {
    if (mobile && onNavigate) {
      onNavigate();
    }
  };

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
          {(!isCollapsed || mobile) && (
            <span className="text-lg font-bold text-sidebar-foreground">
              Cindy <span className="text-sidebar-primary">IA</span>
            </span>
          )}
        </div>
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3" style={{ height: mobile ? 'calc(100vh - 64px - 80px)' : 'calc(100vh - 64px - 80px)' }}>
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
                {(!isCollapsed || mobile) && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {(!isCollapsed || mobile) && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/70">
              powered by <span className="font-semibold text-sidebar-primary">Onelord</span>
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
