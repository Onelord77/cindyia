import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NotificationProvider } from "@/components/notifications";
import { ThemeProvider } from "@/components/theme";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Agendamentos from "./pages/Agendamentos";
import Clientes from "./pages/Clientes";
import Funcionarios from "./pages/Funcionarios";
import Servicos from "./pages/Servicos";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Integracoes from "./pages/Integracoes";
import Notificacoes from "./pages/Notificacoes";
import SuperAdminEmpresas from "./pages/admin/Empresas";
import AdminConfiguracoes from "./pages/admin/Configuracoes";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEndpoints from "./pages/admin/Endpoints";
import AdminNotificacoes from "./pages/admin/Notificacoes";
import AdminWhatsAppInstances from "./pages/admin/WhatsAppInstances";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="cindy-ia-theme">
      <TooltipProvider>
        <AuthProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes - Only Login, no registration */}
                <Route path="/login" element={<Login />} />
                
                {/* Redirect old cadastro route to login */}
                <Route path="/cadastro" element={<Navigate to="/login" replace />} />

                {/* Onboarding */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                {/* Tenant Routes - todos os usuários do tenant veem tudo */}
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
                <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/funcionarios" element={<ProtectedRoute><Funcionarios /></ProtectedRoute>} />
                <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
                <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/integracoes" element={<ProtectedRoute><Integracoes /></ProtectedRoute>} />
                <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />

                {/* Super Admin Only Routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/empresas" element={<ProtectedRoute requiredRoles={['super_admin']}><SuperAdminEmpresas /></ProtectedRoute>} />
                <Route path="/admin/whatsapp-instances" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminWhatsAppInstances /></ProtectedRoute>} />
                <Route path="/admin/notificacoes" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminNotificacoes /></ProtectedRoute>} />
                <Route path="/admin/endpoints" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminEndpoints /></ProtectedRoute>} />
                <Route path="/admin/configuracoes" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminConfiguracoes /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
