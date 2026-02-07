import { useState, useMemo } from "react";
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
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { CompletedPanel } from "./CompletedPanel";

interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComplete: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onReorder: (updates: { id: string; sort_order: number; status?: TaskStatus }[]) => void;
}

export function KanbanBoard({
  tasks,
  onEdit,
  onDelete,
  onComplete,
  onAddTask,
  onReorder,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Update local tasks when props change
  useMemo(() => {
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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column (only active statuses are droppable columns)
    const isOverColumn = ACTIVE_STATUSES.includes(overId as TaskStatus);
    const newStatus = isOverColumn
      ? (overId as TaskStatus)
      : localTasks.find((t) => t.id === overId)?.status;

    if (newStatus && newStatus !== activeTask.status && ACTIVE_STATUSES.includes(newStatus)) {
      setLocalTasks((prev) => {
        return prev.map((t) =>
          t.id === activeId ? { ...t, status: newStatus } : t
        );
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine target status
    const isOverColumn = ACTIVE_STATUSES.includes(overId as TaskStatus);
    const targetStatus = isOverColumn
      ? (overId as TaskStatus)
      : localTasks.find((t) => t.id === overId)?.status || activeTask.status;

    // Get tasks in target status
    const targetTasks = localTasks
      .filter((t) => t.status === targetStatus && t.id !== activeId)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Find insertion index
    let newIndex = targetTasks.length;
    if (!isOverColumn) {
      const overIndex = targetTasks.findIndex((t) => t.id === overId);
      if (overIndex !== -1) {
        newIndex = overIndex;
      }
    }

    // Insert active task at new position
    const reorderedTasks = [...targetTasks];
    reorderedTasks.splice(newIndex, 0, { ...activeTask, status: targetStatus });

    // Generate updates
    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      sort_order: index,
      status: targetStatus,
    }));

    // Update local state
    setLocalTasks((prev) => {
      const otherTasks = prev.filter(
        (t) => t.status !== targetStatus && t.id !== activeId
      );
      return [
        ...otherTasks,
        ...reorderedTasks.map((t, i) => ({ ...t, sort_order: i })),
      ];
    });

    // Persist changes
    onReorder(updates);
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Active columns */}
        <div className="flex h-full min-h-0 flex-1 gap-4 overflow-x-auto p-4 scrollbar-thin">
          {ACTIVE_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onAddTask={onAddTask}
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
      </DndContext>

      {/* Completed panel — right side, outside DnD context */}
      <div className="border-l border-border p-4 pl-0">
        <CompletedPanel tasks={tasksByStatus.Done} onEdit={onEdit} />
      </div>
    </div>
  );
}
