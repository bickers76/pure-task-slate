import { useMemo } from "react";
import { Menu, CircleDot, Loader, BellRing, CalendarClock } from "lucide-react";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useTaskBoard } from "@/hooks/useTaskBoard";
import { computeStats } from "@/lib/taskFilters";
import { useIsMobile } from "@/hooks/use-mobile";

function DashboardContent() {
  const { openMobileMenu } = useAppShell();
  const isMobile = useIsMobile();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const board = useTaskBoard(tasks);
  const stats = useMemo(() => computeStats(tasks), [tasks]);
  const loading = tasksLoading || projectsLoading;
  const show = (n: number) => (loading ? "—" : n);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="space-y-4 md:space-y-6 p-2 md:p-6 lg:p-8">
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
          <p className="text-muted-foreground">Everything on the board, across all projects.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open" value={show(stats.open)} icon={<CircleDot className="h-5 w-5" />} />
          <StatCard label="In progress" value={show(stats.inProgress)} icon={<Loader className="h-5 w-5" />} />
          <StatCard
            label="Needs you"
            value={show(stats.needsYou)}
            icon={<BellRing className="h-5 w-5" />}
            active={board.filters.attentionOnly}
            onClick={() => board.patchFilters({ attentionOnly: !board.filters.attentionOnly })}
          />
          <StatCard label="Due or overdue (7 days)" value={show(stats.dueSoon)} icon={<CalendarClock className="h-5 w-5" />} />
        </div>

        <TaskBoardView
          board={board}
          projects={projects}
          totalTasks={tasks.length}
          attentionCount={stats.needsYou}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
