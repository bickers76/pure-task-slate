import { supabase } from "@/integrations/supabase/client";
import { Task, TaskStatus, TaskPriority } from "@/types";

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  tags?: string[] | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  tags?: string[] | null;
  sort_order?: number;
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
    // Get max sort_order for the status
    const { data: maxOrderData } = await supabase
      .from("tasks")
      .select("sort_order")
      .eq("project_id", input.project_id)
      .eq("status", input.status || "Backlog")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = maxOrderData && maxOrderData.length > 0 
      ? maxOrderData[0].sort_order + 1 
      : 0;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        ...input,
        status: input.status || "Backlog",
        priority: input.priority || "Medium",
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
    // Update tasks one by one (batch updates not supported directly)
    for (const update of updates) {
      const { error } = await supabase
        .from("tasks")
        .update({ sort_order: update.sort_order, ...(update.status && { status: update.status }) })
        .eq("id", update.id);

      if (error) throw error;
    }
  },

  // Stats helpers
  async getOpenCount(): Promise<number> {
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .not("status", "in", '("Done","Canceled")');

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

  async getDueSoonCount(): Promise<number> {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);

    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .not("status", "in", '("Done","Canceled")')
      .not("due_date", "is", null)
      .lte("due_date", weekFromNow.toISOString().split("T")[0])
      .gte("due_date", now.toISOString().split("T")[0]);

    if (error) throw error;
    return count || 0;
  },
};
