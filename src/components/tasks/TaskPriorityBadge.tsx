import { TaskPriority } from "@/types";
import { cn } from "@/lib/utils";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const priorityStyles: Record<TaskPriority, string> = {
  Low: "text-muted-foreground",
  Medium: "text-amber-600 dark:text-amber-400",
  High: "text-red-600 dark:text-red-400",
};

const priorityIcons: Record<TaskPriority, string> = {
  Low: "↓",
  Medium: "→",
  High: "↑",
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return (
    <span className={cn("text-sm font-medium", priorityStyles[priority])}>
      {priorityIcons[priority]} {priority}
    </span>
  );
}
