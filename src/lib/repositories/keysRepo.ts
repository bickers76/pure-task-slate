import { api } from "@/lib/api";
import { TaskAssignee } from "@/types";

export interface ApiKey {
  id: string;
  name: string;
  agent: TaskAssignee;
  /** First and last characters only; the full key is never stored. */
  key_hint: string;
  created_at: string;
  last_used_at: string | null;
}

/** A newly created key. `key` is shown once and cannot be retrieved again. */
export type NewApiKey = ApiKey & { key: string };

export const keysRepo = {
  list: () => api<ApiKey[]>("/keys"),
  create: (name: string) => api<NewApiKey>("/keys", { method: "POST", body: { name } }),
  async revoke(id: string): Promise<void> {
    await api(`/keys/${id}`, { method: "DELETE" });
  },
};
