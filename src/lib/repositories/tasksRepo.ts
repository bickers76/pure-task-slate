import { supabase } from "@/integrations/supabase/client";
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
  async listAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, project:projects(*)")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data as Task[];
  },

  async listByProject(projectId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data as Task[];
  },

  async getById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, project:projects(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as Task | null;
  },

  async create(input: CreateTaskInput): Promise<Task> {
    // Get min sort_order to place new task at the top
    const { data: minOrderData } = await supabase
      .from("tasks")
      .select("sort_order")
      .order("sort_order", { ascending: true })
      .limit(1);

    const nextSortOrder = minOrderData && minOrderData.length > 0 
      ? minOrderData[0].sort_order - 1 
      : 0;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: input.project_id,
        title: input.title,
        description: input.description ?? null,
        status: input.status || "Backlog",
        priority: input.priority || "Medium",
        due_date: input.due_date ?? null,
        tags: input.tags ?? null,
        assignee: input.assignee || "Mervbot",
        deliverable: input.deliverable ?? null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async update(id: string, updates: UpdateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  /** Puts a deleted task back with its original id, position and timestamps. */
  async restore(task: Task): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id: task.id,
        project_id: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        tags: task.tags,
        assignee: task.assignee,
        deliverable: task.deliverable,
        sort_order: task.sort_order,
        created_at: task.created_at,
        // Only send the newer columns when they hold something, so restore
        // still works on a database that hasn't had those migrations applied.
        ...(task.review_feedback && { review_feedback: task.review_feedback }),
        ...(task.blocked_reason && { blocked_reason: task.blocked_reason }),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async reorderTasks(updates: { id: string; sort_order: number; status?: TaskStatus }[]): Promise<void> {
    const results = await Promise.all(
      updates.map((update) =>
        supabase
          .from("tasks")
          .update({ sort_order: update.sort_order, ...(update.status && { status: update.status }) })
          .eq("id", update.id)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  },
};
