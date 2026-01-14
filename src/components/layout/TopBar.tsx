import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface TopBarProps {
  title: string;
  actions?: ReactNode;
  onMenuClick?: () => void;
}

export function TopBar({ title, actions, onMenuClick }: TopBarProps) {
  const isMobile = useIsMobile();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        {isMobile && onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-9 w-9">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
