import { api, ApiError } from "@/lib/api";
import { Project } from "@/types";

export const projectsRepo = {
  list: () => api<Project[]>("/projects"),

  async getById(id: string): Promise<Project | null> {
    try {
      return await api<Project>(`/projects/${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  create: (name: string) => api<Project>("/projects", { method: "POST", body: { name } }),

  update: (id: string, updates: Partial<Pick<Project, "name">>) =>
    api<Project>(`/projects/${id}`, { method: "PATCH", body: updates }),

  async delete(id: string): Promise<void> {
    await api(`/projects/${id}`, { method: "DELETE" });
  },
};
