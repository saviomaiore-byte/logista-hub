import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";
import Auth from "./pages/Auth";
import Motoristas from "./pages/Motoristas";
import Seguros from "./pages/Seguros";
import ConferenciaSeguros from "./pages/ConferenciaSeguros";
import Contratos from "./pages/Contratos";
import Conferencia from "./pages/Conferencia";
import Certificados from "./pages/Certificados";
import DocumentosEmpresa from "./pages/DocumentosEmpresa";
import Usuarios from "./pages/Usuarios";
import Transportadores from "./pages/Transportadores";
import Seguranca from "./pages/Seguranca";
import Relatorios from "./pages/Relatorios";
import Assistente from "./pages/Assistente";
import OAuthConsent from "./pages/OAuthConsent";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function safeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to={safeNext(searchParams.get("next")) ?? "/"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/motoristas" element={<ProtectedRoute><Motoristas /></ProtectedRoute>} />
      <Route path="/seguros" element={<ProtectedRoute><Seguros /></ProtectedRoute>} />
      <Route path="/conferencia-seguros" element={<ProtectedRoute><ConferenciaSeguros /></ProtectedRoute>} />
      <Route path="/transportadores" element={<ProtectedRoute><Transportadores /></ProtectedRoute>} />
      <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
      <Route path="/conferencia" element={<ProtectedRoute><Conferencia /></ProtectedRoute>} />
      <Route path="/certificados" element={<ProtectedRoute><Certificados /></ProtectedRoute>} />
      <Route path="/documentos-empresa" element={<ProtectedRoute><DocumentosEmpresa /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
      <Route path="/seguranca" element={<ProtectedRoute><Seguranca /></ProtectedRoute>} />
      <Route path="/assistente" element={<ProtectedRoute><Assistente /></ProtectedRoute>} />
      <Route path="/assistente/:threadId" element={<ProtectedRoute><Assistente /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
