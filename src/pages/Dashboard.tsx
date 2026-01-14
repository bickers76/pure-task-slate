import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProjects } from "@/hooks/useProjects";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { Task, TaskStatus, TaskPriority, ACTIVE_STATUSES } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

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
    setTaskDialogOpen(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
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
          />

          {/* Task Table */}
          {tasksLoading || projectsLoading ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : activeTasks.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {projects.length === 0
                ? "No tasks yet. Create your first project to get started."
                : "No tasks match your filters."}
            </div>
          ) : (
            <TaskTable
              tasks={activeTasks}
              showProject
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          )}

          {/* Done Tasks Section (Collapsed) */}
          {doneTasks.length > 0 && (
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
                  showProject
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
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
      />
    </AppShell>
  );
}
