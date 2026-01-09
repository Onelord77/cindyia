import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  isSuperAdmin?: boolean;
}

export function MainLayout({ children, isSuperAdmin = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar isSuperAdmin={isSuperAdmin} />
      <div className="pl-[260px] transition-all duration-300">
        <Header />
        <main className="min-h-[calc(100vh-4rem)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
