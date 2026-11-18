import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskFilters, ColumnVisibility } from "@/components/tasks/TaskFilters";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskBoard } from "@/hooks/useTaskBoard";
import { Project } from "@/types";
import { cn } from "@/lib/utils";

interface TaskBoardViewProps {
  board: TaskBoard;
  /** Projects offered when creating a task. */
  projects: Project[];
  /** Number of tasks before filtering, to tell "empty" from "no matches". */
  totalTasks: number;
  attentionCount: number;
  isLoading: boolean;
  /** Pin the task dialog to one project (project page). */
  projectId?: string;
  showProjectColumn?: boolean;
}

/** Filters, list/kanban views, the Done section and the task dialog. */
export function TaskBoardView({
  board,
  projects,
  totalTasks,
  attentionCount,
  isLoading,
  projectId,
  showProjectColumn = true,
}: TaskBoardViewProps) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    title: true,
    project: showProjectColumn,
    status: true,
    priority: true,
    dueDate: true,
  });

  const hasProjects = projects.length > 0;
  // On a project page new rows always go to that project.
  const tableProjects = projectId ? projects.filter((p) => p.id === projectId) : projects;
  const showingDoneOnly = board.filters.status === "Done";

  return (
    <>
      <TaskFilters
        filters={board.filters}
        onFiltersChange={board.patchFilters}
        attentionCount={attentionCount}
        onAddTask={() => board.openNewTask()}
        viewMode={board.viewMode}
        onViewModeChange={board.setViewMode}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        searchInputRef={board.searchInputRef}
      />

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : board.viewMode === "kanban" ? (
        <KanbanBoard
          tasks={board.filteredTasks}
          onEdit={board.openEditTask}
          onDelete={board.removeTask}
          onComplete={board.completeTask}
          onAddTask={board.openNewTask}
          onReview={board.review}
          onUnblock={board.unblock}
          onReorder={board.reorder}
        />
      ) : (
        <>
          {!showingDoneOnly && (
            <TaskTable
              tasks={board.activeTasks}
              projects={tableProjects}
              onEdit={board.openEditTask}
              onDelete={board.removeTask}
              onComplete={board.completeTask}
              onQuickAdd={hasProjects ? board.quickAdd : undefined}
              onInlineEdit={board.inlineEdit}
              columnVisibility={columnVisibility}
            />
          )}

          {!showingDoneOnly && board.activeTasks.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {!hasProjects
                ? "No tasks yet. Create your first project to get started."
                : totalTasks === 0
                  ? "No tasks yet. Add your first task above."
                  : board.filters.attentionOnly
                    ? "Nothing is waiting on you."
                    : "No open tasks match your filters."}
            </div>
          )}

          {board.doneTasks.length > 0 && (
            <Collapsible open={board.doneOpen} onOpenChange={board.setDoneOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex w-full items-center justify-between px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="font-medium">Done ({board.doneTasks.length})</span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", board.doneOpen && "rotate-180")}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <TaskTable
                  tasks={board.doneTasks}
                  projects={tableProjects}
                  onEdit={board.openEditTask}
                  onDelete={board.removeTask}
                  onComplete={board.completeTask}
                  onInlineEdit={board.inlineEdit}
                  columnVisibility={columnVisibility}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {showingDoneOnly && board.doneTasks.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              No completed tasks match your filters.
            </div>
          )}
        </>
      )}

      <TaskDialog
        open={board.dialogOpen}
        onOpenChange={board.setDialogOpen}
        task={board.editingTask}
        projects={projects}
        defaultProjectId={projectId}
        defaultStatus={board.defaultStatus}
        onSave={board.saveTask}
      />
    </>
  );
}
