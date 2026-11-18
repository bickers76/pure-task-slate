import { describe, it, expect } from "vitest";
import { applyOrderUpdates, computeReorder } from "@/lib/taskOrder";
import { computeStats, matchesFilters, needsAttention, parseTags, EMPTY_FILTERS } from "@/lib/taskFilters";
import { Task, TaskStatus } from "@/types";

function task(id: string, status: TaskStatus, sort_order: number, extra: Partial<Task> = {}): Task {
  return {
    id,
    project_id: "p1",
    title: `Task ${id}`,
    description: null,
    status,
    priority: "Medium",
    due_date: null,
    tags: null,
    sort_order,
    assignee: "Mervbot",
    deliverable: null,
    review_feedback: null,
    blocked_reason: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

const order = (tasks: Task[], status: TaskStatus) =>
  tasks
    .filter((t) => t.status === status)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => t.id);

describe("computeReorder", () => {
  const board = [
    task("a", "Backlog", 0),
    task("b", "Backlog", 1),
    task("c", "Backlog", 2),
    task("x", "In Progress", 0),
    task("y", "In Progress", 1),
  ];

  it("moves a card up within its column and only writes changed rows", () => {
    const updates = computeReorder(board, "c", "Backlog", "a");
    expect(order(applyOrderUpdates(board, updates), "Backlog")).toEqual(["c", "a", "b"]);
    expect(updates.every((u) => u.status === undefined)).toBe(true);
  });

  it("moves a card down within its column", () => {
    const updates = computeReorder(board, "a", "Backlog", "b");
    expect(order(applyOrderUpdates(board, updates), "Backlog")).toEqual(["b", "a", "c"]);
    const toEnd = computeReorder(board, "a", "Backlog", "c");
    expect(order(applyOrderUpdates(board, toEnd), "Backlog")).toEqual(["b", "c", "a"]);
  });

  it("keeps its sort position when dropped on its own placeholder in a new column", () => {
    const moving = [task("m", "Backlog", 1), task("x", "In Progress", 0), task("y", "In Progress", 5)];
    const updates = computeReorder(moving, "m", "In Progress", "m");
    expect(order(applyOrderUpdates(moving, updates), "In Progress")).toEqual(["x", "m", "y"]);
  });

  it("writes nothing when a card is dropped where it already is", () => {
    expect(computeReorder(board, "a", "Backlog", "a")).toEqual([]);
    expect(computeReorder(board, "c", "Backlog", null)).toEqual([]);
  });

  it("moves a card to another column in front of the card it was dropped on", () => {
    const updates = computeReorder(board, "a", "In Progress", "y");
    const next = applyOrderUpdates(board, updates);
    expect(order(next, "In Progress")).toEqual(["x", "a", "y"]);
    expect(order(next, "Backlog")).toEqual(["b", "c"]);
    expect(updates.find((u) => u.id === "a")?.status).toBe("In Progress");
  });

  it("appends to the end when dropped on the column itself", () => {
    const updates = computeReorder(board, "a", "In Progress", null);
    expect(updates).toEqual([{ id: "a", sort_order: 2, status: "In Progress" }]);
  });

  it("drops into an empty column", () => {
    expect(computeReorder(board, "a", "Review", null)).toEqual([
      { id: "a", sort_order: 0, status: "Review" },
    ]);
  });

  it("keeps hidden cards in place when only a filtered subset is visible", () => {
    // Full column order is a(0) h1(1) b(2) h2(3) c(4); h1 and h2 are filtered out.
    const full = [
      task("a", "Backlog", 0),
      task("h1", "Backlog", 1),
      task("b", "Backlog", 2),
      task("h2", "Backlog", 3),
      task("c", "Backlog", 4),
    ];
    const visible = full.filter((t) => !t.id.startsWith("h"));
    const updates = computeReorder(visible, "c", "Backlog", "a");
    expect(updates.some((u) => u.id.startsWith("h"))).toBe(false);
    expect(order(applyOrderUpdates(full, updates), "Backlog")).toEqual(["c", "h1", "a", "h2", "b"]);
  });

  it("repairs duplicate sort values instead of preserving the tie", () => {
    const dupes = [task("a", "Backlog", 0), task("b", "Backlog", 0), task("c", "Backlog", 0)];
    const next = applyOrderUpdates(dupes, computeReorder(dupes, "c", "Backlog", "a"));
    expect(order(next, "Backlog")).toEqual(["c", "a", "b"]);
    expect(new Set(next.map((t) => t.sort_order)).size).toBe(3);
  });
});

describe("filters and stats", () => {
  it("flags review and blocked tasks as needing attention, but never done ones", () => {
    expect(needsAttention(task("a", "Review", 0))).toBe(true);
    expect(needsAttention(task("b", "In Progress", 0, { blocked_reason: "Need login" }))).toBe(true);
    expect(needsAttention(task("c", "In Progress", 0))).toBe(false);
    expect(needsAttention(task("d", "Done", 0, { blocked_reason: "old" }))).toBe(false);
  });

  it("searches title, description and tags", () => {
    const t = task("a", "Backlog", 0, { title: "Write copy", description: "For homepage", tags: ["SEO"] });
    expect(matchesFilters(t, { ...EMPTY_FILTERS, search: "homepage" })).toBe(true);
    expect(matchesFilters(t, { ...EMPTY_FILTERS, search: "seo" })).toBe(true);
    expect(matchesFilters(t, { ...EMPTY_FILTERS, search: "pricing" })).toBe(false);
    expect(matchesFilters(t, { ...EMPTY_FILTERS, assignee: "Wayne" })).toBe(false);
    expect(matchesFilters(t, { ...EMPTY_FILTERS, attentionOnly: true })).toBe(false);
  });

  it("counts open, in-progress, needs-you and due-soon tasks", () => {
    const today = new Date(2026, 10, 18); // 18 Nov 2026, local time
    const stats = computeStats(
      [
        task("a", "Backlog", 0, { due_date: "2026-11-10" }), // overdue
        task("b", "In Progress", 0, { due_date: "2026-11-25" }), // within 7 days
        task("c", "In Progress", 0, { due_date: "2026-11-26" }), // just outside
        task("d", "Review", 0),
        task("e", "Done", 0, { due_date: "2026-11-18" }),
      ],
      today
    );
    expect(stats).toEqual({ open: 4, inProgress: 2, needsYou: 1, dueSoon: 2 });
  });

  it("parses comma-separated tags", () => {
    expect(parseTags(" bug, urgent ,Bug,, ")).toEqual(["bug", "urgent"]);
    expect(parseTags("  ")).toBeNull();
  });
});
