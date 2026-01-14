import { TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusStyles: Record<TaskStatus, string> = {
  Todo: "bg-secondary text-secondary-foreground hover:bg-secondary",
  "In Progress": "bg-secondary text-secondary-foreground hover:bg-secondary",
  Done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
};

const statusLabels: Record<TaskStatus, string> = {
  Todo: "To do",
  "In Progress": "In Progress",
  Done: "Done",
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-medium", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
