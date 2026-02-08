import { useState } from "react";
import { Task } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Pencil, Trash2, GripVertical, CheckCircle2, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComplete?: (task: Task) => void;
}

export function KanbanCard({ task, onEdit, onDelete, onComplete }: KanbanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const hasDetails = task.description || task.deliverable;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border border-border/60 bg-card p-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20",
        expanded && "ring-1 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-muted-foreground/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 active:cursor-grabbing transition-opacity p-1 -m-1 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-0 md:m-0 flex items-center justify-center"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Title + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5">
              {onComplete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete(task); }}
                  className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-emerald-500 transition-colors p-1.5 -m-1.5 md:p-0 md:m-0"
                  title="Mark complete"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => hasDetails && setExpanded(!expanded)}
                className={cn(
                  "text-left",
                  hasDetails && "cursor-pointer"
                )}
              >
                <p className="text-sm font-semibold leading-snug text-foreground tracking-tight line-clamp-2">
                  {task.title}
                </p>
              </button>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {hasDetails && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:h-6 md:w-6 opacity-60 hover:opacity-100 transition-opacity"
                  onClick={() => setExpanded(!expanded)}
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:h-6 md:w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {onComplete && (
                    <DropdownMenuItem onClick={() => onComplete(task)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(task)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project badge */}
            {task.project && (
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {task.project.name}
              </span>
            )}

            {/* Assignee badge */}
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                task.assignee === "Wayne" ? "bg-blue-500" : "bg-purple-500"
              )}
            >
              {task.assignee === "Wayne" ? "W" : "M"}
            </span>

            {/* Priority dot */}
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                task.priority === "High" && "bg-red-500",
                task.priority === "Medium" && "bg-amber-400",
                task.priority === "Low" && "bg-emerald-500"
              )}
            />

            {/* Due date */}
            {task.due_date && (
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isOverdue ? "text-red-500" : "text-muted-foreground/80"
                )}
              >
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-1 space-y-2 border-t border-border/40 pt-2.5 max-h-[200px] overflow-y-auto scrollbar-thin">
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              )}
              {task.deliverable && (
                <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1.5">
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-primary font-medium truncate">
                    {task.deliverable}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
