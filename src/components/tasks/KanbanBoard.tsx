import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Task, TaskStatus, ACTIVE_STATUSES, TASK_STATUSES } from "@/types";
import { OrderUpdate, applyOrderUpdates, computeReorder } from "@/lib/taskOrder";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { CompletedPanel } from "./CompletedPanel";
import { ReviewDecision } from "./ReviewActions";

interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComplete: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onReview?: (task: Task, decision: ReviewDecision) => void;
  onUnblock?: (task: Task) => void;
  onReorder: (updates: OrderUpdate[]) => void;
}

export function KanbanBoard({
  tasks,
  onEdit,
  onDelete,
  onComplete,
  onAddTask,
  onReview,
  onUnblock,
  onReorder,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Update local tasks when props change
  useEffect(() => {
    if (!activeTask) {
      setLocalTasks(tasks);
    }
  }, [tasks, activeTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      Backlog: [],
      "In Progress": [],
      Review: [],
      Done: [],
    };
    localTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    // Sort by sort_order within each status
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.sort_order - b.sort_order);
    });
    return grouped;
  }, [localTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = localTasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const columnOf = (overId: string): TaskStatus | undefined =>
    (TASK_STATUSES as string[]).includes(overId)
      ? (overId as TaskStatus)
      : localTasks.find((t) => t.id === overId)?.status;

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const dragged = localTasks.find((t) => t.id === activeId);
    const newStatus = columnOf(over.id as string);

    // Preview the move between the open columns; Done only takes the drop.
    if (dragged && newStatus && newStatus !== dragged.status && ACTIVE_STATUSES.includes(newStatus)) {
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: newStatus } : t))
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const targetStatus = columnOf(overId);
    if (!targetStatus) return;

    // Work from the saved state: the drag preview has already moved the card locally.
    const isColumn = (TASK_STATUSES as string[]).includes(overId);
    const updates = computeReorder(tasks, activeId, targetStatus, isColumn ? null : overId);
    if (updates.length === 0) {
      setLocalTasks(tasks);
      return;
    }

    setLocalTasks(applyOrderUpdates(tasks, updates));
    onReorder(updates);
  };

  return (
    <div className="flex h-full flex-1 flex-col md:flex-row overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Active columns */}
        <div className="flex h-full min-h-0 flex-1 gap-3 md:gap-4 overflow-x-auto p-1 md:p-4 scrollbar-thin">
          {ACTIVE_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onAddTask={onAddTask}
              onReview={onReview}
              onUnblock={onUnblock}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="opacity-90">
              <KanbanCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>

        {/* Completed panel — right side on desktop, bottom on mobile */}
        <div className="border-t md:border-t-0 md:border-l border-border p-3 md:p-4 md:pl-0 shrink-0">
          <CompletedPanel tasks={tasksByStatus.Done} onEdit={onEdit} isDragging={!!activeTask} />
        </div>
      </DndContext>
    </div>
  );
}
