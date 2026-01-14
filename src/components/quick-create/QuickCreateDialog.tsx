import { useState } from "react";
import { Plus, FolderPlus, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project, TaskPriority, TASK_PRIORITIES } from "@/types";

interface QuickCreateDialogProps {
  projects: Project[];
  onCreateProject: (name: string) => Promise<void>;
  onCreateTask: (projectId: string, title: string, priority: TaskPriority) => Promise<void>;
}

export function QuickCreateDialog({
  projects,
  onCreateProject,
  onCreateTask,
}: QuickCreateDialogProps) {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateProject(projectName.trim());
      setProjectName("");
      setProjectDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !selectedProject) return;
    setIsSubmitting(true);
    try {
      await onCreateTask(selectedProject, taskTitle.trim(), selectedPriority);
      setTaskTitle("");
      setSelectedProject("");
      setSelectedPriority("Medium");
      setTaskDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setProjectDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTaskDialogOpen(true)}
            disabled={projects.length === 0}
          >
            <ListPlus className="mr-2 h-4 w-4" />
            New Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                autoFocus
              />
            </div>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                placeholder="Enter task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={selectedPriority}
                onValueChange={(v) => setSelectedPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || !selectedProject || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
