import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Truck,
  LogOut,
  Shield,
  ShieldCheck,
  UsersRound,
  Menu,
  ClipboardList,
  Building2,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#35c8c1] to-[#15969c] shadow-[0_8px_24px_rgba(22,184,178,0.22)]",
      compact ? "h-8 w-8" : "h-10 w-10",
    )}>
      <svg viewBox="0 0 28 28" className={compact ? "h-5 w-5" : "h-6 w-6"} fill="none" aria-hidden="true">
        <path d="M7 5.5V22.5M21 5.5V22.5M7 14H15.5L21 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const navigationSections = [
  {
    label: "VISÃO GERAL",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "OPERAÇÃO",
    items: [
      { name: "Transportadores", href: "/transportadores", icon: Truck },
      { name: "Motoristas", href: "/motoristas", icon: Users },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      { name: "Seguros", href: "/seguros", icon: Shield },
      { name: "Contratos", href: "/contratos", icon: FileText },
      { name: "Conferência Docs", href: "/conferencia", icon: AlertTriangle },
      { name: "Certificados Digitais", href: "/certificados", icon: Calendar },
    ],
  },
  {
    label: "INTELIGÊNCIA",
    items: [
      { name: "Relatórios", href: "/relatorios", icon: ClipboardList },
      { name: "Assistente", href: "/assistente", icon: MessagesSquare },
    ],
  },
];

const adminNavigation = {
  label: "SISTEMA",
  items: [
    { name: "Usuários", href: "/usuarios", icon: UsersRound },
    { name: "Segurança", href: "/seguranca", icon: ShieldCheck },
  ],
};

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const sections = useMemo(
    () => (isAdmin ? [...navigationSections, adminNavigation] : navigationSections),
    [isAdmin]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2.5 pb-5 pt-2">
        {sections.map((section, sectionIndex) => (
          <div key={section.label} className={cn(sectionIndex > 0 && "mt-5")}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#62b7b3]">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "nav-item",
                      isActive && "active",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0 text-[#9ad0d0]" strokeWidth={1.7} />
                    {!collapsed && <span className="animate-fade-in">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mx-3 border-t border-white/[0.07] px-1 py-4">
        {!collapsed ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-medium text-sidebar-foreground">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.user_metadata?.nome || user?.email}
                </p>
                <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2.5">
            <BrandMark compact />
            <div>
              <h1 className="text-base font-bold leading-tight text-white">Logística Hub</h1>
              <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#68aeb4]">Maiore impulsiona</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Desktop: wrap SidebarContent + collapse toggle */}
        <div className="flex h-[82px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold leading-tight text-white">Logística Hub</h1>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#68aeb4]">Maiore impulsiona</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!collapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
