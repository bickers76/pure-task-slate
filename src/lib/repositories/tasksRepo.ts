import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";
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

  // Stats helpers
  async getOpenCount(): Promise<number> {
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .neq("status", "Done");

    if (error) throw error;
    return count || 0;
  },

  async getInProgressCount(): Promise<number> {
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "In Progress");

    if (error) throw error;
    return count || 0;
  },

  async getReviewCount(): Promise<number> {
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "Review");

    if (error) throw error;
    return count || 0;
  },

  async getDueSoonCount(): Promise<number> {
    // due_date is a plain calendar date, so compare against local dates, not UTC.
    const now = new Date();
    const weekFromNow = addDays(now, 7);

    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .neq("status", "Done")
      .not("due_date", "is", null)
      .lte("due_date", format(weekFromNow, "yyyy-MM-dd"))
      .gte("due_date", format(now, "yyyy-MM-dd"));

    if (error) throw error;
    return count || 0;
  },
};
