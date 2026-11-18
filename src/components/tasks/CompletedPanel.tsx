import { useDroppable } from "@dnd-kit/core";
import { Task } from "@/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface CompletedPanelProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  /** True while a card is being dragged, to advertise the drop target. */
  isDragging?: boolean;
}

export function CompletedPanel({ tasks, onEdit, isDragging }: CompletedPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "Done" });

  // Most recently completed first.
  const sorted = [...tasks].sort((a, b) =>
    (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at)
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-48 md:h-full w-full md:w-[280px] shrink-0 flex-col rounded-lg border border-border bg-muted/20 transition-colors",
        isDragging && "border-dashed border-green-500/50",
        isOver && "bg-green-500/10 border-green-500"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-3">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <h3 className="text-sm font-medium">Completed</h3>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500/15 px-1.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
          {tasks.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {tasks.length === 0 && (
          <p className="p-3 text-center text-xs text-muted-foreground">
            {isDragging ? "Drop here to complete" : "No completed tasks"}
          </p>
        )}
        <div className="space-y-1.5">
          {sorted.map((task) => (
            <button
              key={task.id}
              onClick={() => onEdit?.(task)}
              className="flex w-full flex-col gap-1 rounded-lg border border-border/40 bg-card/60 p-2.5 text-left transition-colors hover:bg-card hover:border-border"
            >
              <span className="text-sm font-medium leading-snug text-foreground/80 line-clamp-2">
                {task.title}
              </span>
              <div className="flex items-center gap-2">
                {task.project && (
                  <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {task.project.name}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white",
                    task.assignee === "Wayne" ? "bg-blue-500" : "bg-purple-500"
                  )}
                >
                  {task.assignee === "Wayne" ? "W" : "M"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(task.completed_at ?? task.updated_at), "MMM d")}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
