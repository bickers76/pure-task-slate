import { toast } from "sonner";
import { useUpdateTask } from "@/hooks/useTasks";
import { Task } from "@/types";
import { ReviewDecision } from "@/components/tasks/ReviewActions";

/** Review decisions shared by the dashboard and project boards. */
export function useReviewTask() {
  const updateTask = useUpdateTask();

  return async (task: Task, decision: ReviewDecision) => {
    try {
      if (decision.type === "approve") {
        await updateTask.mutateAsync({
          id: task.id,
          updates: { status: "Done", review_feedback: null },
        });
        toast.success("Approved");
      } else {
        await updateTask.mutateAsync({
          id: task.id,
          updates: { status: "In Progress", review_feedback: decision.feedback },
        });
        toast.success(`Sent back to ${task.assignee}`);
      }
    } catch {
      toast.error("Failed to update task");
    }
  };
}
