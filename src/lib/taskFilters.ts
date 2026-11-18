import { addDays, format } from "date-fns";
import { Task, TaskAssignee, TaskPriority, TaskStatus } from "@/types";

export interface TaskFilterState {
  search: string;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  assignee: TaskAssignee | "all";
  /** Only tasks waiting on a human: in Review, or flagged as blocked. */
  attentionOnly: boolean;
}

export const EMPTY_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  priority: "all",
  assignee: "all",
  attentionOnly: false,
};

/** A task needs attention when it is waiting for review or flagged as blocked. */
export function needsAttention(task: Task): boolean {
  if (task.status === "Done") return false;
  return task.status === "Review" || !!task.blocked_reason;
}

export function matchesFilters(task: Task, filters: TaskFilterState): boolean {
  const query = filters.search.trim().toLowerCase();
  if (query) {
    const haystack = [task.title, task.description ?? "", ...(task.tags ?? [])]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.status !== "all" && task.status !== filters.status) return false;
  if (filters.priority !== "all" && task.priority !== filters.priority) return false;
  if (filters.assignee !== "all" && task.assignee !== filters.assignee) return false;
  if (filters.attentionOnly && !needsAttention(task)) return false;
  return true;
}

export interface TaskStats {
  open: number;
  inProgress: number;
  needsYou: number;
  dueSoon: number;
}

/** Counts for the dashboard. "Due soon" includes anything already overdue. */
export function computeStats(tasks: Task[], today: Date = new Date()): TaskStats {
  // due_date is a plain calendar date, so compare as local yyyy-MM-dd strings.
  const cutoff = format(addDays(today, 7), "yyyy-MM-dd");
  const open = tasks.filter((t) => t.status !== "Done");
  return {
    open: open.length,
    inProgress: open.filter((t) => t.status === "In Progress").length,
    needsYou: open.filter(needsAttention).length,
    dueSoon: open.filter((t) => !!t.due_date && t.due_date <= cutoff).length,
  };
}

/** Turns "bug, urgent ,bug" into ["bug", "urgent"]; null when empty. */
export function parseTags(input: string): string[] | null {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags.length ? tags : null;
}
