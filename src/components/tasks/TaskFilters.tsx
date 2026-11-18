import { RefObject } from "react";
import { Search, CirclePlus, SlidersHorizontal, LayoutList, Kanban, BellRing } from "lucide-react";
import { TaskFilterState } from "@/lib/taskFilters";
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
  filters: TaskFilterState;
  onFiltersChange: (patch: Partial<TaskFilterState>) => void;
  /** How many tasks currently need attention; shown on the toggle. */
  attentionCount?: number;
  onAddTask?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void;
  searchInputRef?: RefObject<HTMLInputElement>;
}

export function TaskFilters({
  filters,
  onFiltersChange,
  attentionCount = 0,
  onAddTask,
  viewMode = "list",
  onViewModeChange,
  columnVisibility = { title: true, project: true, status: true, priority: true, dueDate: true },
  onColumnVisibilityChange,
  searchInputRef,
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

        <Button
          variant="outline"
          size="sm"
          aria-pressed={filters.attentionOnly}
          title="Show only tasks waiting on you: in Review or flagged as blocked"
          className={cn(
            "h-11 md:h-9 gap-2",
            filters.attentionOnly && "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}
          onClick={() => onFiltersChange({ attentionOnly: !filters.attentionOnly })}
        >
          <BellRing className="h-4 w-4" />
          <span>Needs you</span>
          {attentionCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
              {attentionCount}
            </span>
          )}
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
            ref={searchInputRef}
            placeholder="Filter tasks...  ( / )"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onFiltersChange({ search: "" });
                e.currentTarget.blur();
              }
            }}
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
              onClick={() => onFiltersChange({ assignee: val as TaskAssignee | "all" })}
              className={cn(
                "h-11 md:h-9 px-3 text-xs font-medium transition-colors min-w-[44px]",
                filters.assignee === val
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {val === "all" ? "All" : val}
            </button>
          ))}
        </div>

        <Select value={filters.status} onValueChange={(v) => onFiltersChange({ status: v as TaskStatus | "all" })}>
          <SelectTrigger className="w-auto h-11 md:h-9 gap-2 border-border">
            <CirclePlus className="h-4 w-4 text-muted-foreground" />
            <span>{filters.status === "all" ? "Status" : filters.status}</span>
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
        <Select value={filters.priority} onValueChange={(v) => onFiltersChange({ priority: v as TaskPriority | "all" })}>
          <SelectTrigger className="w-auto h-11 md:h-9 gap-2 border-border">
            <CirclePlus className="h-4 w-4 text-muted-foreground" />
            <span>{filters.priority === "all" ? "Priority" : filters.priority}</span>
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
