import { TaskPriority } from "@/types";
import { cn } from "@/lib/utils";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const priorityStyles: Record<TaskPriority, string> = {
  Low: "text-muted-foreground",
  Medium: "text-foreground",
  High: "text-foreground",
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return (
    <span className={cn("text-sm font-medium", priorityStyles[priority])}>
      {priority}
    </span>
  );
}
