import { ReactNode, useState, createContext, useContext } from "react";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppShellContextType {
  openMobileMenu: () => void;
}

const AppShellContext = createContext<AppShellContextType | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShell");
  }
  return context;
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobileMenu = () => setMobileOpen(true);

  return (
    <AppShellContext.Provider value={{ openMobileMenu }}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </AppShellContext.Provider>
  );
}
