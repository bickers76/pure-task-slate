import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  /** Makes the card a toggle button. */
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ label, value, icon, onClick, active }: StatCardProps) {
  const content = (
    <>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          active && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
    </>
  );

  if (!onClick) {
    return <Card className="flex items-center gap-4 p-4">{content}</Card>;
  }

  return (
    <Card className={cn("transition-colors hover:border-foreground/30", active && "border-amber-500/60")}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="flex w-full items-center gap-4 rounded-lg p-4 text-left"
      >
        {content}
      </button>
    </Card>
  );
}
