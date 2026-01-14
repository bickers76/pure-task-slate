import { TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusStyles: Record<TaskStatus, string> = {
  Todo: "bg-secondary text-secondary-foreground hover:bg-secondary",
  "In Progress": "bg-primary/10 text-primary hover:bg-primary/10",
  Done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-medium", statusStyles[status])}>
      {status}
    </Badge>
  );
}
