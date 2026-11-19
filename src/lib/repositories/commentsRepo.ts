import { api } from "@/lib/api";
import { TaskComment } from "@/types";

export const commentsRepo = {
  listByTask: (taskId: string) => api<TaskComment[]>(`/tasks/${taskId}/comments`),

  /** The server records the signed-in person as the author. */
  create: (taskId: string, body: string) =>
    api<TaskComment>(`/tasks/${taskId}/comments`, { method: "POST", body: { body } }),
};
