import { supabase } from "@/integrations/supabase/client";
import { TaskAssignee, TaskComment } from "@/types";

export const commentsRepo = {
  async listByTask(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as TaskComment[];
  },

  async create(taskId: string, author: TaskAssignee, body: string): Promise<TaskComment> {
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id: taskId, author, body })
      .select()
      .single();

    if (error) throw error;
    return data as TaskComment;
  },
};
