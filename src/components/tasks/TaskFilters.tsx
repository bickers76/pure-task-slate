import { Search, CirclePlus, SlidersHorizontal, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES, TASK_PRIORITIES, TaskStatus, TaskPriority } from "@/types";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (value: TaskStatus | "all") => void;
  priorityFilter: TaskPriority | "all";
  onPriorityFilterChange: (value: TaskPriority | "all") => void;
  onAddTask?: () => void;
}

export function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  onAddTask,
}: TaskFiltersProps) {
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
            {TASK_STATUSES.filter(s => s !== "Done" && s !== "Canceled").map((status) => (
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

      {/* Right side: View + Add Task */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          View
        </Button>
        <Button size="sm" className="h-9 gap-2" onClick={onAddTask}>
          Add Task
        </Button>
      </div>
    </div>
  );
}
