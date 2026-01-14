import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProjectDetail() {
  const { projectId } = useParams();

  return (
    <AppShell>
      <TopBar
        title="Project"
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-5xl p-6">
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p>Project: {projectId}</p>
            <p className="mt-2">List and Kanban views coming soon.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
