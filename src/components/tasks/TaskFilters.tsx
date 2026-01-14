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
import { TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority } from "@/types";

export type ViewMode = "list" | "kanban";

export interface ColumnVisibility {
  title: boolean;
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
  onAddTask,
  viewMode = "list",
  onViewModeChange,
  columnVisibility = { title: true, status: true, priority: true, dueDate: true },
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
    <div className="flex items-center justify-between gap-4">
      {/* Left side: Search + Filter buttons */}
      <div className="flex items-center gap-2">
        <div className="relative w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as TaskStatus | "all")}>
          <SelectTrigger className="w-auto h-9 gap-2 border-border">
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
          <SelectTrigger className="w-auto h-9 gap-2 border-border">
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
      </div>

      {/* Right side: View Mode + View Options + Add Task */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center border border-border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-3 rounded-r-none ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange?.("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-3 rounded-l-none ${viewMode === "kanban" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange?.("kanban")}
          >
            <Kanban className="h-4 w-4" />
          </Button>
        </div>

        {/* View Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
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

        <Button
          size="sm" 
          className="h-9 gap-2 bg-foreground text-background hover:bg-primary hover:text-primary-foreground" 
          onClick={onAddTask}
        >
          Add Task
        </Button>
      </div>
    </div>
  );
}
