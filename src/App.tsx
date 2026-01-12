import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
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
import SuperAdminEmpresas from "./pages/admin/Empresas";
import AdminConfiguracoes from "./pages/admin/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes - Only Login, no registration */}
              <Route path="/login" element={<Login />} />
              
              {/* Redirect old cadastro route to login */}
              <Route path="/cadastro" element={<Navigate to="/login" replace />} />

              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
              <Route path="/funcionarios" element={<ProtectedRoute requiredRoles={['admin', 'manager', 'super_admin']}><Funcionarios /></ProtectedRoute>} />
              <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute requiredRoles={['admin', 'manager', 'super_admin']}><Financeiro /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute requiredRoles={['admin', 'manager', 'super_admin']}><Relatorios /></ProtectedRoute>} />
              <Route path="/integracoes" element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><Integracoes /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><Configuracoes /></ProtectedRoute>} />

              {/* Super Admin Routes */}
              <Route path="/admin/empresas" element={<ProtectedRoute requiredRoles={['super_admin']}><SuperAdminEmpresas /></ProtectedRoute>} />
              <Route path="/admin/configuracoes" element={<ProtectedRoute requiredRoles={['super_admin']}><AdminConfiguracoes /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
