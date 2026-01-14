import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Task, TaskStatus, TaskPriority, TASK_STATUSES, TASK_PRIORITIES } from "@/types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ColumnVisibility } from "./TaskFilters";
import { format, parseISO, isValid } from "date-fns";

export interface QuickAddData {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
}

interface TaskTableProps {
  tasks: Task[];
  showProject?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  onQuickAdd?: (data: QuickAddData) => void;
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

// Format due date without color coding
function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "—";
  
  const date = parseISO(dueDate);
  if (!isValid(date)) return "—";
  
  return format(date, "MMM d, yyyy");
}

export function TaskTable({ 
  tasks, 
  showProject = false, 
  onEdit, 
  onDelete,
  onComplete,
  onQuickAdd,
  columnVisibility = { title: true, status: true, priority: true, dueDate: true },
}: TaskTableProps) {
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus>("Backlog");
  const [quickAddPriority, setQuickAddPriority] = useState<TaskPriority>("Medium");
  const [quickAddDueDate, setQuickAddDueDate] = useState("");

  const handleQuickAddSubmit = () => {
    if (quickAddTitle.trim() && onQuickAdd) {
      onQuickAdd({
        title: quickAddTitle.trim(),
        status: quickAddStatus,
        priority: quickAddPriority,
        due_date: quickAddDueDate || null,
      });
      // Reset form
      setQuickAddTitle("");
      setQuickAddStatus("Backlog");
      setQuickAddPriority("Medium");
      setQuickAddDueDate("");
    }
  };

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuickAddSubmit();
    } else if (e.key === "Escape") {
      setQuickAddTitle("");
      setQuickAddStatus("Backlog");
      setQuickAddPriority("Medium");
      setQuickAddDueDate("");
    }
  };

  // Calculate column count for spanning
  let colCount = 3; // checkbox, task id, actions
  if (columnVisibility.title) colCount++;
  if (showProject) colCount++;
  if (columnVisibility.dueDate) colCount++;
  if (columnVisibility.status) colCount++;
  if (columnVisibility.priority) colCount++;

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
            {columnVisibility.dueDate && (
              <TableHead className="w-[140px] text-muted-foreground font-medium">Due Date</TableHead>
            )}
            {columnVisibility.status && (
              <TableHead className="w-[140px] text-muted-foreground font-medium">Status</TableHead>
            )}
            {columnVisibility.priority && (
              <TableHead className="w-[120px] text-muted-foreground font-medium">Priority</TableHead>
            )}
            <TableHead className="w-[44px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Inline Quick Add Row */}
          {onQuickAdd && (
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableCell className="pl-4">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-sm">
                —
              </TableCell>
              {columnVisibility.title && (
                <TableCell className="py-2">
                  <Input
                    placeholder="Add a task..."
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={handleQuickAddKeyDown}
                    className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/60"
                  />
                </TableCell>
              )}
              {showProject && <TableCell>—</TableCell>}
              {columnVisibility.dueDate && (
                <TableCell className="py-2">
                  <Input
                    type="date"
                    value={quickAddDueDate}
                    onChange={(e) => setQuickAddDueDate(e.target.value)}
                    className="h-8 w-[130px] text-sm"
                  />
                </TableCell>
              )}
              {columnVisibility.status && (
                <TableCell className="py-2">
                  <Select value={quickAddStatus} onValueChange={(v) => setQuickAddStatus(v as TaskStatus)}>
                    <SelectTrigger className="h-8 w-[120px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.filter(s => s !== "Done" && s !== "Canceled").map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              {columnVisibility.priority && (
                <TableCell className="py-2">
                  <Select value={quickAddPriority} onValueChange={(v) => setQuickAddPriority(v as TaskPriority)}>
                    <SelectTrigger className="h-8 w-[100px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              <TableCell className="pr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handleQuickAddSubmit}
                  disabled={!quickAddTitle.trim()}
                >
                  Add
                </Button>
              </TableCell>
            </TableRow>
          )}

          {tasks.length === 0 && !onQuickAdd && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">
                No tasks to display.
              </TableCell>
            </TableRow>
          )}

          {tasks.map((task) => {
            const taskType = task.tags?.[0];
            const isDone = task.status === "Done";
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
                {columnVisibility.dueDate && (
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {task.due_date && <Calendar className="h-3.5 w-3.5" />}
                      <span>{formatDueDate(task.due_date)}</span>
                    </div>
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
