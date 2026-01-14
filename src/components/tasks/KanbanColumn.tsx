import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

const statusColors: Record<TaskStatus, string> = {
  Backlog: "border-t-muted-foreground",
  Todo: "border-t-secondary-foreground",
  "In Progress": "border-t-primary",
  Done: "border-t-green-500",
  Canceled: "border-t-muted-foreground",
};

export function KanbanColumn({
  status,
  tasks,
  isCollapsed = false,
  onToggleCollapse,
  onEdit,
  onDelete,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex h-full w-12 shrink-0 cursor-pointer flex-col items-center rounded-lg border border-border bg-muted/30 py-3 transition-colors hover:bg-muted/50",
          statusColors[status],
          "border-t-2"
        )}
        onClick={onToggleCollapse}
      >
        <span
          className="text-sm font-medium text-muted-foreground"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {status} ({tasks.length})
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30",
        statusColors[status],
        "border-t-2",
        isOver && "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{status}</h3>
          <span className="text-sm text-muted-foreground">({tasks.length})</span>
        </div>
        {status === "Done" && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={onToggleCollapse}
          >
            ×
          </Button>
        )}
        {onAddTask && status !== "Done" && status !== "Canceled" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => onAddTask(status)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 overflow-y-auto p-2 pt-0 scrollbar-thin">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
