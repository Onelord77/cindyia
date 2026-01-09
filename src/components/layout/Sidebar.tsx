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
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plug,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  superAdminOnly?: boolean;
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
  { label: 'Integrações', icon: Plug, href: '/integracoes' },
  { label: 'Configurações', icon: Settings, href: '/configuracoes' },
];

const superAdminItems: SidebarItem[] = [
  { label: 'Empresas', icon: Building2, href: '/admin/empresas', superAdminOnly: true },
  { label: 'Config. Admin', icon: Shield, href: '/admin/configuracoes', superAdminOnly: true },
];

interface SidebarProps {
  isSuperAdmin?: boolean;
}

export function Sidebar({ isSuperAdmin = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const allItems = isSuperAdmin ? [...superAdminItems, ...menuItems] : menuItems;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className={cn('flex items-center gap-2 overflow-hidden', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Sparkles className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">
              Agend<span className="text-sidebar-primary">AI</span>
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {isSuperAdmin && !collapsed && (
          <span className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Super Admin
          </span>
        )}
        
        {allItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          if (item.superAdminOnly && !isSuperAdmin) return null;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'animate-scale-in')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/70">
              Powered by <span className="font-semibold text-sidebar-primary">AgendAI</span>
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
