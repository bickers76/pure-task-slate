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
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComplete?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

const statusColors: Record<string, string> = {
  Backlog: "border-t-secondary-foreground",
  "In Progress": "border-t-blue-500",
  Review: "border-t-amber-500",
  Done: "border-t-green-500",
};

export function KanbanColumn({
  status,
  tasks,
  onEdit,
  onDelete,
  onComplete,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-w-[260px] w-[calc(100vw-2.5rem)] sm:w-auto flex-1 flex-col rounded-lg border border-border bg-muted/30 shrink-0 md:shrink",
        statusColors[status] || "border-t-secondary-foreground",
        "border-t-2",
        isOver && "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{status}</h3>
          <span className="text-sm text-muted-foreground">({tasks.length})</span>
        </div>
        {onAddTask && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:h-6 md:w-6 text-muted-foreground"
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
              onComplete={onComplete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
