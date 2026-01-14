import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { Project } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Projects() {
  const { data: projects = [], isLoading } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectName(project.name);
    } else {
      setEditingProject(null);
      setProjectName("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!projectName.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingProject) {
        await updateProjectMutation.mutateAsync({
          id: editingProject.id,
          name: projectName.trim(),
        });
        toast.success("Project updated");
      } else {
        await createProjectMutation.mutateAsync(projectName.trim());
        toast.success("Project created");
      }
      setDialogOpen(false);
      setProjectName("");
      setEditingProject(null);
    } catch {
      toast.error("Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      await deleteProjectMutation.mutateAsync(project.id);
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <AppShell>
      <TopBar title="Projects" />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <div className="flex flex-col gap-3 max-w-md">
            <Button 
              size="sm" 
              className="gap-2 w-fit" 
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
            {isLoading ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                <p>No projects yet. Create your first project to get started.</p>
              </div>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="group relative p-4">
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(project)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(project)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Link
                    to={`/projects/${project.id}`}
                    className="block space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created {format(new Date(project.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Rename Project" : "Create Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!projectName.trim() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Saving..." : editingProject ? "Save" : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
