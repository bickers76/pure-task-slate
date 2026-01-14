import { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, Pencil, Trash2, Calendar, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { Task, TaskStatus, TaskPriority, TASK_STATUSES, TASK_PRIORITIES, Project } from "@/types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ColumnVisibility } from "./TaskFilters";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

export interface QuickAddData {
  project_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
}

export interface InlineEditData {
  id: string;
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

type SortField = "title" | "project" | "dueDate" | "status" | "priority";
type SortDirection = "asc" | "desc";

interface TaskTableProps {
  tasks: Task[];
  projects?: Project[];
  showProject?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  onQuickAdd?: (data: QuickAddData) => void;
  onInlineEdit?: (data: InlineEditData) => void;
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

// Status order for sorting
const STATUS_ORDER: Record<TaskStatus, number> = {
  "Todo": 0,
  "In Progress": 1,
  "Done": 2,
};

// Priority order for sorting
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  "High": 0,
  "Medium": 1,
  "Low": 2,
};

export function TaskTable({ 
  tasks, 
  projects = [],
  showProject = false, 
  onEdit, 
  onDelete,
  onComplete,
  onQuickAdd,
  onInlineEdit,
  columnVisibility = { title: true, status: true, priority: true, dueDate: true },
}: TaskTableProps) {
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddProjectId, setQuickAddProjectId] = useState(projects[0]?.id || "");
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus>("Todo");
  const [quickAddPriority, setQuickAddPriority] = useState<TaskPriority>("Medium");
  const [quickAddDueDate, setQuickAddDueDate] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Update default project when projects change
  useEffect(() => {
    if (projects.length > 0 && !quickAddProjectId) {
      setQuickAddProjectId(projects[0].id);
    }
  }, [projects, quickAddProjectId]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks;

    return [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "project":
          const projectA = a.project?.name || "";
          const projectB = b.project?.name || "";
          comparison = projectA.localeCompare(projectB);
          break;
        case "dueDate":
          const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
        case "status":
          comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case "priority":
          comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Reset sort
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
    }
    return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  };

  const handleQuickAddSubmit = () => {
    if (quickAddTitle.trim() && quickAddProjectId && onQuickAdd) {
      onQuickAdd({
        project_id: quickAddProjectId,
        title: quickAddTitle.trim(),
        status: quickAddStatus,
        priority: quickAddPriority,
        due_date: quickAddDueDate || null,
      });
      // Reset form but keep project selection
      setQuickAddTitle("");
      setQuickAddStatus("Todo");
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
      setQuickAddStatus("Todo");
      setQuickAddPriority("Medium");
      setQuickAddDueDate("");
    }
  };

  // Inline editing handlers
  const startEditingTitle = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingField("title");
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingField(null);
    setEditingTitle("");
  };

  const saveTitle = (taskId: string) => {
    if (editingTitle.trim() && onInlineEdit) {
      onInlineEdit({ id: taskId, title: editingTitle.trim() });
    }
    cancelEditing();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle(taskId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleInlineStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (onInlineEdit) {
      onInlineEdit({ id: taskId, status: newStatus });
    }
  };

  const handleInlinePriorityChange = (taskId: string, newPriority: TaskPriority) => {
    if (onInlineEdit) {
      onInlineEdit({ id: taskId, priority: newPriority });
    }
  };

  const handleInlineDueDateChange = (taskId: string, newDueDate: string) => {
    if (onInlineEdit) {
      onInlineEdit({ id: taskId, due_date: newDueDate || null });
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
              <TableHead 
                className="text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center">
                  Title
                  <SortIcon field="title" />
                </div>
              </TableHead>
            )}
            {showProject && (
              <TableHead 
                className="text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("project")}
              >
                <div className="flex items-center">
                  Project
                  <SortIcon field="project" />
                </div>
              </TableHead>
            )}
            {columnVisibility.dueDate && (
              <TableHead 
                className="w-[140px] text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("dueDate")}
              >
                <div className="flex items-center">
                  Due Date
                  <SortIcon field="dueDate" />
                </div>
              </TableHead>
            )}
            {columnVisibility.status && (
              <TableHead 
                className="w-[140px] text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
            )}
            {columnVisibility.priority && (
              <TableHead 
                className="w-[130px] text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort("priority")}
              >
                <div className="flex items-center">
                  Priority
                  <SortIcon field="priority" />
                </div>
              </TableHead>
            )}
            <TableHead className="w-[44px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Inline Quick Add Row */}
          {onQuickAdd && (
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableCell className="pl-4 py-3">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-sm py-3">
                —
              </TableCell>
              {columnVisibility.title && (
                <TableCell className="py-3">
                  <Input
                    placeholder="Add a task..."
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={handleQuickAddKeyDown}
                    className="h-auto !border-0 !ring-0 bg-transparent shadow-none focus-visible:!ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/60"
                  />
                </TableCell>
              )}
              {showProject && (
                <TableCell className="py-3">
                  <Select value={quickAddProjectId} onValueChange={setQuickAddProjectId}>
                    <SelectTrigger className="h-auto w-auto text-sm !border-0 !ring-0 bg-transparent shadow-none focus:!ring-0 p-0 gap-1">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-md z-50">
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              {columnVisibility.dueDate && (
                <TableCell className="py-3">
                  <Input
                    type="date"
                    value={quickAddDueDate}
                    onChange={(e) => setQuickAddDueDate(e.target.value)}
                    className="h-auto w-[130px] text-sm !border-0 !ring-0 bg-transparent shadow-none focus-visible:!ring-0 focus-visible:ring-offset-0 p-0"
                  />
                </TableCell>
              )}
              {columnVisibility.status && (
                <TableCell className="py-3">
                  <Select value={quickAddStatus} onValueChange={(v) => setQuickAddStatus(v as TaskStatus)}>
                    <SelectTrigger className="h-auto w-auto text-sm !border-0 !ring-0 bg-transparent shadow-none focus:!ring-0 p-0 gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-md z-50">
                      {TASK_STATUSES.filter(s => s !== "Done").map((status) => (
                        <SelectItem key={status} value={status}>
                          {status === "Todo" ? "To do" : status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              {columnVisibility.priority && (
                <TableCell className="py-3">
                  <Select value={quickAddPriority} onValueChange={(v) => setQuickAddPriority(v as TaskPriority)}>
                    <SelectTrigger className="h-auto w-auto text-sm !border-0 !ring-0 bg-transparent shadow-none focus:!ring-0 p-0 gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-md z-50">
                      {TASK_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              <TableCell className="pr-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs"
                  onClick={handleQuickAddSubmit}
                  disabled={!quickAddTitle.trim() || !quickAddProjectId}
                >
                  Add
                </Button>
              </TableCell>
            </TableRow>
          )}

          {sortedTasks.length === 0 && !onQuickAdd && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">
                No tasks to display.
              </TableCell>
            </TableRow>
          )}

          {sortedTasks.map((task) => {
            const taskType = task.tags?.[0];
            const isDone = task.status === "Done";
            const isEditingThisTask = editingTaskId === task.id;

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
                    {isEditingThisTask && editingField === "title" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => handleTitleKeyDown(e, task.id)}
                          onBlur={() => saveTitle(task.id)}
                          autoFocus
                          className="h-8 text-sm"
                        />
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          "flex items-center gap-2 rounded px-1 -mx-1 py-0.5",
                          onInlineEdit && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => onInlineEdit && startEditingTitle(task)}
                      >
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
                    )}
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
                    {onInlineEdit ? (
                      <Input
                        type="date"
                        value={task.due_date || ""}
                        onChange={(e) => handleInlineDueDateChange(task.id, e.target.value)}
                        className="h-8 w-[140px] text-sm px-2 border-transparent bg-transparent hover:border-border focus:border-border"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {task.due_date && <Calendar className="h-3.5 w-3.5" />}
                        <span>{formatDueDate(task.due_date)}</span>
                      </div>
                    )}
                  </TableCell>
                )}
                {columnVisibility.status && (
                  <TableCell>
                    {onInlineEdit ? (
                      <Select 
                        value={task.status} 
                        onValueChange={(v) => handleInlineStatusChange(task.id, v as TaskStatus)}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-sm border-transparent bg-transparent hover:border-border">
                          <TaskStatusBadge status={task.status} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border shadow-md z-50">
                          {TASK_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <TaskStatusBadge status={task.status} />
                    )}
                  </TableCell>
                )}
                {columnVisibility.priority && (
                  <TableCell>
                    {onInlineEdit ? (
                      <Select 
                        value={task.priority} 
                        onValueChange={(v) => handleInlinePriorityChange(task.id, v as TaskPriority)}
                      >
                        <SelectTrigger className="h-8 w-[110px] text-sm border-transparent bg-transparent hover:border-border">
                          <TaskPriorityBadge priority={task.priority} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border shadow-md z-50">
                          {TASK_PRIORITIES.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <TaskPriorityBadge priority={task.priority} />
                    )}
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
                    <DropdownMenuContent align="end" className="bg-popover border border-border shadow-md z-50">
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
