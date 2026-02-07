import { TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusStyles: Record<TaskStatus, string> = {
  Backlog: "bg-secondary text-secondary-foreground hover:bg-secondary",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30",
  Review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30",
  Done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
};

const statusLabels: Record<TaskStatus, string> = {
  Backlog: "Backlog",
  "In Progress": "In Progress",
  Review: "Review",
  Done: "Done",
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("font-medium whitespace-nowrap", statusStyles[status])}
    >
      {statusLabels[status]}
    </Badge>
  );
}
