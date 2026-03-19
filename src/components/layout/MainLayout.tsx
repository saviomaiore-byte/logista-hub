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
      <main className={isMobile ? "min-w-0 pt-14" : "min-w-0 pl-64 transition-all duration-300"}>
        <div className={isMobile ? "p-3 pb-6" : "p-6 lg:p-8"}>{children}</div>
      </main>
    </div>
  );
}
