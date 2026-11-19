import { api, ApiError } from "@/lib/api";
import { OrderUpdate } from "@/lib/taskOrder";
import { Task, TaskStatus, TaskPriority, TaskAssignee } from "@/types";

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  tags?: string[] | null;
  assignee?: TaskAssignee;
  deliverable?: string | null;
}

export interface UpdateTaskInput {
  project_id?: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  tags?: string[] | null;
  sort_order?: number;
  assignee?: TaskAssignee;
  deliverable?: string | null;
  review_feedback?: string | null;
  blocked_reason?: string | null;
}

export const tasksRepo = {
  listAll: () => api<Task[]>("/tasks"),

  listByProject: (projectId: string) =>
    api<Task[]>(`/tasks?project_id=${encodeURIComponent(projectId)}`),

  async getById(id: string): Promise<Task | null> {
    try {
      return await api<Task>(`/tasks/${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  create: (input: CreateTaskInput) => api<Task>("/tasks", { method: "POST", body: input }),

  update: (id: string, updates: UpdateTaskInput) =>
    api<Task>(`/tasks/${id}`, { method: "PATCH", body: updates }),

  /** Puts a deleted task back with its original id, position and creation time. */
  restore: (task: Task) => api<Task>("/tasks/restore", { method: "POST", body: task }),

  async delete(id: string): Promise<void> {
    await api(`/tasks/${id}`, { method: "DELETE" });
  },

  /** Saves a drag-and-drop result; the server applies all changes or none. */
  async reorderTasks(updates: OrderUpdate[]): Promise<void> {
    await api("/tasks/reorder", { method: "POST", body: { updates } });
  },
};
