import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickCreateDialog } from "@/components/quick-create/QuickCreateDialog";
import { ListChecks, Clock, CalendarDays, FolderKanban } from "lucide-react";

export default function Dashboard() {
  // Placeholder data - will be replaced with real Supabase data
  const projects: { id: string; name: string; created_at: string; updated_at: string }[] = [];

  const handleCreateProject = async (name: string) => {
    console.log("Create project:", name);
  };

  const handleCreateTask = async (projectId: string, title: string, priority: string) => {
    console.log("Create task:", { projectId, title, priority });
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
        <div className="mx-auto max-w-5xl space-y-8 p-6">
          {/* Stats Grid */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Open Tasks"
              value={0}
              icon={<ListChecks className="h-5 w-5" />}
            />
            <StatCard
              label="In Progress"
              value={0}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              label="Due Soon"
              value={0}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <StatCard
              label="Projects"
              value={0}
              icon={<FolderKanban className="h-5 w-5" />}
            />
          </section>

          {/* Tasks Table Placeholder */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Tasks</h2>
            </div>
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              <p>No tasks yet. Create your first project to get started.</p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
