import { useState, useMemo } from "react";
import { Plus, ListChecks, Clock, CalendarDays, FolderKanban, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickCreateDialog } from "@/components/quick-create/QuickCreateDialog";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useTasks, useTaskStats, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { Task, TaskStatus, TaskPriority, ACTIVE_STATUSES } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: stats } = useTaskStats();

  const createProjectMutation = useCreateProject();
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

  const handleCreateProject = async (name: string) => {
    try {
      await createProjectMutation.mutateAsync(name);
      toast.success("Project created");
    } catch {
      toast.error("Failed to create project");
    }
  };

  const handleCreateTask = async (projectId: string, title: string, priority: TaskPriority) => {
    try {
      await createTaskMutation.mutateAsync({
        project_id: projectId,
        title,
        priority,
      });
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    }
  };

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
      <TopBar
        title="Dashboard"
        actions={
          <QuickCreateDialog
            projects={projects}
            onCreateProject={handleCreateProject}
            onCreateTask={handleCreateTask}
          />
        }
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-8 p-6 lg:p-8">
          {/* Stats Grid */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Open Tasks"
              value={stats?.openCount ?? 0}
              icon={<ListChecks className="h-5 w-5" />}
            />
            <StatCard
              label="In Progress"
              value={stats?.inProgressCount ?? 0}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              label="Due Soon"
              value={stats?.dueSoonCount ?? 0}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <StatCard
              label="Projects"
              value={projects.length}
              icon={<FolderKanban className="h-5 w-5" />}
            />
          </section>

          {/* Active Tasks Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Tasks</h2>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleAddTask}>
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>

            <TaskFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
            />

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
          </section>

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
