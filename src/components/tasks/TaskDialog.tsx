import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, Project, TaskStatus, TaskPriority, TaskAssignee, TASK_STATUSES, TASK_PRIORITIES, TASK_ASSIGNEES } from "@/types";
import { cn } from "@/lib/utils";
import { parseTags } from "@/lib/taskFilters";
import { TaskFormData } from "@/hooks/useTaskBoard";
import { TaskComments } from "./TaskComments";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projects: Project[];
  defaultProjectId?: string;
  defaultStatus?: TaskStatus | null;
  onSave: (data: TaskFormData) => Promise<void>;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  projects,
  defaultProjectId,
  defaultStatus,
  onSave,
}: TaskDialogProps) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("Backlog");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<TaskAssignee>("Mervbot");
  const [deliverable, setDeliverable] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setProjectId(task.project_id);
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date || "");
      setAssignee(task.assignee || "Mervbot");
      setDeliverable(task.deliverable || "");
      setTags(task.tags?.join(", ") || "");
    } else {
      setProjectId(defaultProjectId || "");
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "Backlog");
      setPriority("Medium");
      setDueDate("");
      setAssignee("Mervbot");
      setDeliverable("");
      setTags("");
    }
    // Reset only when the dialog opens or a different task is loaded, so a live
    // refresh of the same task doesn't wipe what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, defaultProjectId, open, defaultStatus]);

  const handleSubmit = async () => {
    if (!title.trim() || !projectId) return;
    setIsSubmitting(true);
    try {
      await onSave({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        due_date: dueDate || null,
        assignee,
        deliverable: deliverable.trim() || null,
        tags: parseTags(tags),
      });
      onOpenChange(false);
    } catch {
      // The caller reports the failure; keep the dialog open so nothing is lost.
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = !!task;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isEdit && task?.blocked_reason && task.status !== "Done" && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                Blocked — needs input
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.blocked_reason}</p>
            </div>
          )}

          {isEdit && task?.review_feedback && task.status !== "Done" && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Changes requested
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.review_feedback}</p>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="task-project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
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
          )}

          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Enter description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assignee</Label>
            <div className="flex gap-2">
              {TASK_ASSIGNEES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAssignee(a)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                    assignee === a
                      ? a === "Wayne"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-purple-600 text-white border-purple-600"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-tags">Tags</Label>
            <Input
              id="task-tags"
              placeholder="bug, research, newsletter"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
          </div>

          {/* Deliverable */}
          <div className="space-y-2">
            <Label htmlFor="task-deliverable">Deliverable</Label>
            <Input
              id="task-deliverable"
              placeholder="~/path/to/file.md or URL"
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              File path or URL to the deliverable
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !projectId || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
          </Button>

          {isEdit && task && (
            <div className="border-t border-border pt-4">
              <TaskComments taskId={task.id} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
