import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types";

export const projectsRepo = {
  async list(): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Project[];
  },

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as Project | null;
  },

  async create(name: string): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  async update(id: string, updates: Partial<Pick<Project, "name">>): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
