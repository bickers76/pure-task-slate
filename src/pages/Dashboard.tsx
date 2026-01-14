import { useState, useMemo } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { TaskFilters, ViewMode, ColumnVisibility } from "@/components/tasks/TaskFilters";
import { TaskTable, QuickAddData, InlineEditData } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProjects } from "@/hooks/useProjects";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useReorderTasks } from "@/hooks/useTasks";
import { Task, TaskStatus, TaskPriority, ACTIVE_STATUSES } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

function DashboardContent() {
  const { openMobileMenu } = useAppShell();
  const isMobile = useIsMobile();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const reorderTasksMutation = useReorderTasks();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    title: true,
    project: true,
    status: true,
    priority: true,
    dueDate: true,
  });
  const [kanbanAddStatus, setKanbanAddStatus] = useState<TaskStatus | null>(null);

  // Filter tasks
  const activeTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!ACTIVE_STATUSES.includes(task.status)) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const allActiveTasksForKanban = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const doneTasks = useMemo(() => {
    return tasks.filter((task) => task.status === "Done");
  }, [tasks]);

  const handleSaveTask = async (data: {
    project_id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
  }) => {
    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({
          id: editingTask.id,
          updates: data,
        });
        toast.success("Task updated");
      } else {
        await createTaskMutation.mutateAsync(data);
        toast.success("Task created");
      }
      setEditingTask(null);
      setKanbanAddStatus(null);
    } catch {
      toast.error("Failed to save task");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setKanbanAddStatus(null);
    setTaskDialogOpen(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setKanbanAddStatus(null);
    setTaskDialogOpen(true);
  };

  const handleKanbanAddTask = (status: TaskStatus) => {
    setEditingTask(null);
    setKanbanAddStatus(status);
    setTaskDialogOpen(true);
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      const newStatus: TaskStatus = task.status === "Done" ? "Todo" : "Done";
      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { status: newStatus },
      });
      toast.success(newStatus === "Done" ? "Task completed!" : "Task reopened");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleReorderTasks = async (updates: { id: string; sort_order: number; status?: TaskStatus }[]) => {
    try {
      await reorderTasksMutation.mutateAsync(updates);
    } catch {
      toast.error("Failed to reorder tasks");
    }
  };

  const handleQuickAddTask = async (data: QuickAddData) => {
    try {
      await createTaskMutation.mutateAsync({
        project_id: data.project_id,
        title: data.title,
        description: null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date,
      });
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    }
  };

  const handleInlineEdit = async (data: InlineEditData) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: data.id,
        updates: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.due_date !== undefined && { due_date: data.due_date }),
        },
      });
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={openMobileMenu} className="h-9 w-9 -ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              )}
              <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
            </div>
            <p className="text-muted-foreground">Here's a list of your tasks for this month.</p>
          </div>

          {/* Filters + Actions */}
          <TaskFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            onAddTask={handleAddTask}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />

          {/* Task View */}
          {tasksLoading || projectsLoading ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : viewMode === "kanban" ? (
            <KanbanBoard
              tasks={allActiveTasksForKanban}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onAddTask={handleKanbanAddTask}
              onReorder={handleReorderTasks}
            />
          ) : (
            <TaskTable
              tasks={activeTasks}
              projects={projects}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onComplete={handleCompleteTask}
              onQuickAdd={projects.length > 0 ? handleQuickAddTask : undefined}
              onInlineEdit={handleInlineEdit}
              columnVisibility={columnVisibility}
            />
          )}

          {/* Empty state when no tasks and no projects */}
          {viewMode === "list" && activeTasks.length === 0 && projects.length === 0 && !tasksLoading && !projectsLoading && (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              No tasks yet. Create your first project to get started.
            </div>
          )}

          {/* Done Tasks Section (Collapsed) - Only show in list view */}
          {viewMode === "list" && doneTasks.length > 0 && (
            <Collapsible open={doneOpen} onOpenChange={setDoneOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex w-full items-center justify-between px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="font-medium">Done ({doneTasks.length})</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      doneOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <TaskTable
                  tasks={doneTasks}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onComplete={handleCompleteTask}
                  onInlineEdit={handleInlineEdit}
                  columnVisibility={columnVisibility}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        projects={projects}
        onSave={handleSaveTask}
        defaultStatus={kanbanAddStatus}
      />
    </>
  );
}

export default function Dashboard() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
