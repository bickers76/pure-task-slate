import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCreateTask,
  useDeleteTask,
  useReorderTasks,
  useRestoreTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { ACTIVE_STATUSES, Task, TaskAssignee, TaskPriority, TaskStatus } from "@/types";
import { EMPTY_FILTERS, TaskFilterState, matchesFilters } from "@/lib/taskFilters";
import { OrderUpdate } from "@/lib/taskOrder";
import type { ReviewDecision } from "@/components/tasks/ReviewActions";
import type { InlineEditData, QuickAddData } from "@/components/tasks/TaskTable";
import type { ViewMode } from "@/components/tasks/TaskFilters";

export interface TaskFormData {
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: TaskAssignee;
  deliverable: string | null;
  tags: string[] | null;
}

const VIEW_KEY = "gsd:view-mode";

function readStoredView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === "kanban" ? "kanban" : "list";
  } catch {
    return "list";
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/**
 * Filter state, derived task lists and every task action shared by the
 * dashboard and the project page.
 *
 * `projectId` pins new tasks to one project (the project page); without it the
 * project comes from the form.
 */
export function useTaskBoard(tasks: Task[], projectId?: string) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const reorderTasks = useReorderTasks();

  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [viewMode, setViewModeState] = useState<ViewMode>(readStoredView);
  const [doneOpen, setDoneOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("Backlog");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      // Remembering the view is a convenience; ignore storage failures.
    }
  }, []);

  const patchFilters = useCallback(
    (patch: Partial<TaskFilterState>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const filteredTasks = useMemo(
    () => tasks.filter((t) => matchesFilters(t, filters)),
    [tasks, filters]
  );
  const activeTasks = useMemo(
    () => filteredTasks.filter((t) => ACTIVE_STATUSES.includes(t.status)),
    [filteredTasks]
  );
  const doneTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === "Done"),
    [filteredTasks]
  );

  // Look the edited task up by id so the dialog always shows live data.
  const editingTask = useMemo(
    () => (editingTaskId ? tasks.find((t) => t.id === editingTaskId) ?? null : null),
    [tasks, editingTaskId]
  );

  const openNewTask = useCallback((status?: TaskStatus) => {
    setEditingTaskId(null);
    setDefaultStatus(status ?? "Backlog");
    setDialogOpen(true);
  }, []);

  const openEditTask = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setDialogOpen(true);
  }, []);

  // Keyboard: "n" starts a new task, "/" jumps to search.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      if (e.key === "n") {
        e.preventDefault();
        openNewTask();
      } else if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openNewTask]);

  const saveTask = async (data: TaskFormData) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, updates: data });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync(data);
        toast.success("Task created");
      }
      setEditingTaskId(null);
    } catch (err) {
      toast.error("Failed to save task");
      throw err;
    }
  };

  const removeTask = async (task: Task) => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast("Task deleted", {
        description: task.title,
        action: {
          label: "Undo",
          onClick: () => {
            restoreTask.mutate(task, {
              onSuccess: () => toast.success("Task restored"),
              onError: () => toast.error("Couldn't restore the task"),
            });
          },
        },
      });
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const completeTask = async (task: Task) => {
    try {
      const newStatus: TaskStatus = task.status === "Done" ? "Backlog" : "Done";
      await updateTask.mutateAsync({ id: task.id, updates: { status: newStatus } });
      toast.success(newStatus === "Done" ? "Task completed!" : "Task reopened");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const reorder = async (updates: OrderUpdate[]) => {
    if (updates.length === 0) return;
    try {
      await reorderTasks.mutateAsync(updates);
    } catch {
      toast.error("Failed to reorder tasks");
    }
  };

  const quickAdd = async (data: QuickAddData) => {
    try {
      await createTask.mutateAsync({
        project_id: projectId ?? data.project_id,
        title: data.title,
        description: null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date,
        assignee: data.assignee,
      });
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    }
  };

  const inlineEdit = async ({ id, ...changes }: InlineEditData) => {
    try {
      await updateTask.mutateAsync({ id, updates: changes });
    } catch {
      toast.error("Failed to update task");
    }
  };

  const review = async (task: Task, decision: ReviewDecision) => {
    try {
      if (decision.type === "approve") {
        await updateTask.mutateAsync({
          id: task.id,
          updates: {
            status: "Done",
            // Only touch the feedback column when there is something to clear.
            ...(task.review_feedback && { review_feedback: null }),
          },
        });
        toast.success("Approved");
      } else {
        await updateTask.mutateAsync({
          id: task.id,
          updates: { status: "In Progress", review_feedback: decision.feedback },
        });
        toast.success(`Sent back to ${task.assignee}`);
      }
    } catch {
      toast.error("Failed to update task");
    }
  };

  const unblock = async (task: Task) => {
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { blocked_reason: null } });
      toast.success("Marked as unblocked");
    } catch {
      toast.error("Failed to update task");
    }
  };

  return {
    // filters and view
    filters,
    patchFilters,
    viewMode,
    setViewMode,
    searchInputRef,
    doneOpen: doneOpen || filters.status === "Done",
    setDoneOpen,
    // derived lists
    filteredTasks,
    activeTasks,
    doneTasks,
    // task dialog
    dialogOpen,
    setDialogOpen,
    editingTask,
    defaultStatus,
    openNewTask,
    openEditTask,
    // actions
    saveTask,
    removeTask,
    completeTask,
    reorder,
    quickAdd,
    inlineEdit,
    review,
    unblock,
  };
}

export type TaskBoard = ReturnType<typeof useTaskBoard>;
