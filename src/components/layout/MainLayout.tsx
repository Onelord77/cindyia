import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { WhatsAppDisconnectAlert } from './WhatsAppDisconnectAlert';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <Sidebar mobile onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar />
      )}
      <div className={cn(
        "transition-all duration-300",
        !isMobile && "pl-[260px]"
      )}>
        <Header onMenuClick={() => setSidebarOpen(true)} showMenuButton={isMobile} />
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6">
          {children}
        </main>
      </div>
      <WhatsAppDisconnectAlert />
    </div>
  );
}
