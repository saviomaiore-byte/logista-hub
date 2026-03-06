import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={isMobile ? "pt-14" : "pl-64 transition-all duration-300"}>
        <div className={isMobile ? "p-4" : "p-8"}>{children}</div>
      </main>
    </div>
  );
}
