import { MoreHorizontal, Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Task } from "@/types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ColumnVisibility } from "./TaskFilters";
import { format, differenceInDays, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskTableProps {
  tasks: Task[];
  showProject?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  columnVisibility?: ColumnVisibility;
}

// Generate a short task ID from UUID
function getShortId(id: string): string {
  const hash = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `TASK-${hash}`;
}

// Get type badge variant based on tag
function getTypeBadgeVariant(type: string): "default" | "secondary" | "outline" {
  const lower = type.toLowerCase();
  if (lower === "bug") return "default";
  if (lower === "feature") return "secondary";
  return "outline";
}

// Get due date styling based on how soon/overdue it is
function getDueDateStyle(dueDate: string | null): { className: string; label: string } {
  if (!dueDate) {
    return { className: "text-muted-foreground", label: "—" };
  }

  const date = parseISO(dueDate);
  if (!isValid(date)) {
    return { className: "text-muted-foreground", label: "—" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = differenceInDays(date, today);

  let className = "text-muted-foreground";
  
  if (daysUntilDue < 0) {
    // Overdue - red
    className = "text-destructive font-medium";
  } else if (daysUntilDue === 0) {
    // Due today - orange
    className = "text-primary font-medium";
  } else if (daysUntilDue <= 3) {
    // Due in 1-3 days - amber/warning
    className = "text-amber-600 dark:text-amber-500";
  } else if (daysUntilDue <= 7) {
    // Due in a week - subtle warning
    className = "text-amber-500/80 dark:text-amber-400/80";
  }

  return { className, label: format(date, "MMM d, yyyy") };
}

export function TaskTable({ 
  tasks, 
  showProject = false, 
  onEdit, 
  onDelete,
  onComplete,
  columnVisibility = { title: true, status: true, priority: true, dueDate: true },
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        No tasks to display.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[40px] pl-4">
              <Checkbox className="opacity-50" disabled />
            </TableHead>
            <TableHead className="w-[100px] text-muted-foreground font-medium">Task</TableHead>
            {columnVisibility.title && (
              <TableHead className="text-muted-foreground font-medium">Title</TableHead>
            )}
            {showProject && <TableHead className="text-muted-foreground font-medium">Project</TableHead>}
            {columnVisibility.status && (
              <TableHead className="w-[120px] text-muted-foreground font-medium">Status</TableHead>
            )}
            {columnVisibility.priority && (
              <TableHead className="w-[100px] text-muted-foreground font-medium">Priority</TableHead>
            )}
            {columnVisibility.dueDate && (
              <TableHead className="w-[120px] text-muted-foreground font-medium">Due Date</TableHead>
            )}
            <TableHead className="w-[44px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const taskType = task.tags?.[0];
            const isDone = task.status === "Done";
            const dueDateStyle = getDueDateStyle(task.due_date);
            return (
              <TableRow key={task.id} className="group border-b border-border/50">
                <TableCell className="pl-4">
                  <Checkbox 
                    checked={isDone}
                    onCheckedChange={() => onComplete?.(task)}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {getShortId(task.id)}
                </TableCell>
                {columnVisibility.title && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {taskType && (
                        <Badge 
                          variant={getTypeBadgeVariant(taskType)}
                          className="text-xs font-normal shrink-0"
                        >
                          {taskType}
                        </Badge>
                      )}
                      <span className="font-medium truncate">{task.title}</span>
                    </div>
                  </TableCell>
                )}
                {showProject && (
                  <TableCell>
                    {task.project ? (
                      <Link
                        to={`/projects/${task.project_id}`}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {task.project.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
                {columnVisibility.status && (
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                )}
                {columnVisibility.priority && (
                  <TableCell>
                    <TaskPriorityBadge priority={task.priority} />
                  </TableCell>
                )}
                {columnVisibility.dueDate && (
                  <TableCell>
                    <div className={cn("flex items-center gap-1.5 text-sm", dueDateStyle.className)}>
                      {task.due_date && <Calendar className="h-3.5 w-3.5" />}
                      <span>{dueDateStyle.label}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(task)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(task)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
