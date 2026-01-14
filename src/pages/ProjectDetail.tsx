import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, List, Kanban, ChevronLeft, ChevronDown } from "lucide-react";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProject } from "@/hooks/useProjects";
import {
  useProjectTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
} from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { Task, TaskStatus, TaskPriority, ACTIVE_STATUSES } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "kanban";

function ProjectDetailContent() {
  const { openMobileMenu } = useAppShell();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(projectId);
  const { data: projects = [] } = useProjects();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const reorderTasksMutation = useReorderTasks();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("Todo");
  const [doneOpen, setDoneOpen] = useState(false);

  // Filter tasks for list view
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
    setDefaultStatus(task.status);
    setTaskDialogOpen(true);
  };

  const handleAddTask = (status?: TaskStatus) => {
    setEditingTask(null);
    setDefaultStatus(status || "Todo");
    setTaskDialogOpen(true);
  };

  const handleReorder = async (updates: { id: string; sort_order: number; status?: TaskStatus }[]) => {
    try {
      await reorderTasksMutation.mutateAsync(updates);
    } catch {
      toast.error("Failed to reorder tasks");
    }
  };

  const handleInlineEdit = async (data: { id: string; title?: string; status?: TaskStatus; priority?: TaskPriority; due_date?: string | null; }) => {
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

  const handleQuickAddTask = async (data: { project_id: string; title: string; status: TaskStatus; priority: TaskPriority; due_date: string | null; }) => {
    try {
      await createTaskMutation.mutateAsync({
        project_id: projectId!,
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

  const handleCompleteTask = async (task: Task) => {
    try {
      const newStatus = task.status === "Done" ? "Todo" : "Done";
      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { status: newStatus },
      });
    } catch {
      toast.error("Failed to update task");
    }
  };

  if (projectLoading) {
    return (
      <>
        <TopBar title="Loading..." onMenuClick={openMobileMenu} />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            Loading project...
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <TopBar title="Project Not Found" onMenuClick={openMobileMenu} />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p>Project not found.</p>
            <Link to="/projects" className="mt-4 inline-block text-primary hover:underline">
              ← Back to Projects
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        onMenuClick={openMobileMenu}
        title={project.name}
        actions={
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="gap-1.5 px-3 text-xs">
                  <List className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5 px-3 text-xs">
                  <Kanban className="h-3.5 w-3.5" />
                  Board
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-2">
        <Link
          to="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Projects
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{project.name}</span>
      </div>

      {viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="space-y-6 p-6">
            <TaskFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              onAddTask={() => handleAddTask()}
            />

            {tasksLoading ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                Loading tasks...
              </div>
            ) : (
              <>
                {/* @ts-expect-error TaskTable props are inferred incorrectly in editor; runtime props are valid */}
                <TaskTable
                  tasks={activeTasks}
                  projects={[project]}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onComplete={handleCompleteTask}
                  onQuickAdd={handleQuickAddTask}
                  onInlineEdit={handleInlineEdit}
                />

                {activeTasks.length === 0 && (
                  <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                    {tasks.length === 0
                      ? "No tasks yet. Create your first task to get started."
                      : "No tasks match your filters."}
                  </div>
                )}
              </>
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
                  {/* @ts-expect-error TaskTable props are inferred incorrectly in editor; runtime props are valid */}
                  <TaskTable
                    tasks={doneTasks}
                    projects={[project]}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onComplete={handleCompleteTask}
                    onInlineEdit={handleInlineEdit}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={tasks}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            onReorder={handleReorder}
          />
        </div>
      )}

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        projects={projects}
        defaultProjectId={projectId}
        onSave={handleSaveTask}
      />
    </>
  );
}

export default function ProjectDetail() {
  return (
    <AppShell>
      <ProjectDetailContent />
    </AppShell>
  );
}
