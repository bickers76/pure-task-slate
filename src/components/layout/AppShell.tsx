import { ReactNode, useState, createContext, useContext } from "react";
import { AppSidebar } from "./AppSidebar";

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

// Safe hook that returns null if not in context (for optional usage)
export function useAppShellOptional() {
  return useContext(AppShellContext);
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
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
