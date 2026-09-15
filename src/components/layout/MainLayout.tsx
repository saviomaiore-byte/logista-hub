import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: ReactNode;
}

const routeLabels: Record<string, string> = {
  "/": "Visão geral",
  "/transportadores": "Transportadores",
  "/motoristas": "Motoristas",
  "/seguros": "Seguros",
  "/contratos": "Contratos",
  "/conferencia": "Conferência Docs",
  "/certificados": "Certificados Digitais",
  "/relatorios": "Relatórios",
  "/assistente": "Assistente",
  "/usuarios": "Usuários",
  "/seguranca": "Segurança",
};

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const displayName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";
  const headerName = displayName.split(" ").filter(Boolean).slice(0, 2).join(" ");
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
  const pageLabel = location.pathname.startsWith("/transportadores/")
    ? "Transportador"
    : routeLabels[location.pathname] || "Workspace";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={isMobile ? "min-w-0 pt-14" : "min-w-0 pl-64 transition-all duration-300"}>
        {!isMobile && (
          <header className="flex h-[86px] items-center justify-between border-b border-border bg-card px-8">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Workspace</span>
              <span className="text-border">/</span>
              <span className="font-semibold text-foreground">{pageLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl text-muted-foreground">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="relative h-11 w-11 rounded-xl text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning ring-2 ring-card" />
              </Button>
              <div className="ml-1 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary">{initials}</div>
                <div className="max-w-44">
                  <p className="truncate text-sm font-semibold text-foreground">{headerName}</p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : "Usuário"}</p>
                </div>
              </div>
            </div>
          </header>
        )}
        <div className={isMobile ? "p-3 pb-6" : "mx-auto max-w-[1540px] px-8 py-10"}>{children}</div>
      </main>
    </div>
  );
}
