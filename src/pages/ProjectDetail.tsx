import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { useProject, useProjects } from "@/hooks/useProjects";
import { useProjectTasks } from "@/hooks/useTasks";
import { useTaskBoard } from "@/hooks/useTaskBoard";
import { needsAttention } from "@/lib/taskFilters";

function ProjectDetailContent() {
  const { openMobileMenu } = useAppShell();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(projectId);
  const { data: projects = [] } = useProjects();
  const board = useTaskBoard(tasks, projectId);
  const attentionCount = useMemo(() => tasks.filter(needsAttention).length, [tasks]);

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
      <TopBar onMenuClick={openMobileMenu} title={project.name} />

      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 md:px-6 py-2">
        <Link
          to="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Projects
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{project.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-4 md:space-y-6 p-2 md:p-6">
          <TaskBoardView
            board={board}
            projects={projects.length > 0 ? projects : [project]}
            totalTasks={tasks.length}
            attentionCount={attentionCount}
            isLoading={tasksLoading}
            projectId={projectId}
            showProjectColumn={false}
          />
        </div>
      </div>
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
