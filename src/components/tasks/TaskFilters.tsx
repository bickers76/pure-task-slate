import { Search, CirclePlus, SlidersHorizontal, LayoutList, Kanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority, TaskAssignee, TASK_ASSIGNEES } from "@/types";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "kanban";

export interface ColumnVisibility {
  title: boolean;
  project: boolean;
  status: boolean;
  priority: boolean;
  dueDate: boolean;
}

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (value: TaskStatus | "all") => void;
  priorityFilter: TaskPriority | "all";
  onPriorityFilterChange: (value: TaskPriority | "all") => void;
  assigneeFilter: TaskAssignee | "all";
  onAssigneeFilterChange: (value: TaskAssignee | "all") => void;
  onAddTask?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void;
}

export function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  onAddTask,
  viewMode = "list",
  onViewModeChange,
  columnVisibility = { title: true, project: true, status: true, priority: true, dueDate: true },
  onColumnVisibilityChange,
}: TaskFiltersProps) {
  const handleColumnToggle = (column: keyof ColumnVisibility) => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange({
        ...columnVisibility,
        [column]: !columnVisibility[column],
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
      {/* Left side: Add Task, View, Search */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm" 
          className="h-11 md:h-9 gap-2 bg-foreground text-background hover:bg-primary hover:text-primary-foreground" 
          onClick={onAddTask}
        >
          Add Task
        </Button>

        {/* View Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-11 md:h-9 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.project}
              onCheckedChange={() => handleColumnToggle("project")}
            >
              Project
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.title}
              onCheckedChange={() => handleColumnToggle("title")}
            >
              Title
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.dueDate}
              onCheckedChange={() => handleColumnToggle("dueDate")}
            >
              Due Date
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={() => handleColumnToggle("status")}
            >
              Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.priority}
              onCheckedChange={() => handleColumnToggle("priority")}
            >
              Priority
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative w-full sm:w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-11 md:h-9"
          />
        </div>
      </div>

      {/* Right side: Assignee, Status, Priority, List/Kanban */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Assignee pill filter */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {(["all", ...TASK_ASSIGNEES] as const).map((val) => (
            <button
              key={val}
              onClick={() => onAssigneeFilterChange(val as TaskAssignee | "all")}
              className={cn(
                "h-11 md:h-9 px-3 text-xs font-medium transition-colors min-w-[44px]",
                assigneeFilter === val
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {val === "all" ? "All" : val}
            </button>
          ))}
        </div>

        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as TaskStatus | "all")}>
          <SelectTrigger className="w-auto h-11 md:h-9 gap-2 border-border">
            <CirclePlus className="h-4 w-4 text-muted-foreground" />
            <span>Status</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {TASK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => onPriorityFilterChange(v as TaskPriority | "all")}>
          <SelectTrigger className="w-auto h-11 md:h-9 gap-2 border-border">
            <CirclePlus className="h-4 w-4 text-muted-foreground" />
            <span>Priority</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {TASK_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={`h-11 md:h-9 px-3 rounded-r-none min-w-[44px] ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange?.("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-11 md:h-9 px-3 rounded-l-none min-w-[44px] ${viewMode === "kanban" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange?.("kanban")}
          >
            <Kanban className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
