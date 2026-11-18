import { Task, TaskStatus } from "@/types";

export interface OrderUpdate {
  id: string;
  sort_order: number;
  status?: TaskStatus;
}

const byOrder = (a: Task, b: Task) => a.sort_order - b.sort_order;

/**
 * Works out which rows to write when a card is dropped.
 *
 * `visibleTasks` may be a filtered subset of the board. Instead of renumbering
 * the column 0..n-1 (which collides with tasks hidden by a filter or living in
 * another project), the sort values already used by the visible cards are
 * reused in the new order, so hidden cards keep their relative position.
 *
 * `overId` is the card the dragged card was dropped on (it takes that card's
 * place), or null when it was dropped on the column itself (goes to the end).
 */
export function computeReorder(
  visibleTasks: Task[],
  activeId: string,
  targetStatus: TaskStatus,
  overId: string | null
): OrderUpdate[] {
  const active = visibleTasks.find((t) => t.id === activeId);
  if (!active) return [];

  const others = visibleTasks
    .filter((t) => t.status === targetStatus && t.id !== activeId)
    .sort(byOrder);

  let ordered: Task[];
  if (active.status === targetStatus) {
    // Same column: the card takes the place of the one it was dropped on, and
    // everything in between shifts by one (works for moving up and down).
    const column = [...others, active].sort(byOrder);
    const from = column.findIndex((t) => t.id === activeId);
    let to = column.length - 1;
    if (overId) {
      const overIndex = column.findIndex((t) => t.id === overId);
      if (overIndex !== -1) to = overIndex;
    }
    ordered = [...column];
    ordered.splice(from, 1);
    ordered.splice(to, 0, active);
  } else {
    // New column: insert in front of the card it was dropped on, or at the end.
    let index = others.length;
    if (overId === activeId) {
      // Dropped on its own placeholder, which sits where its sort value puts it.
      index = others.filter((t) => t.sort_order <= active.sort_order).length;
    } else if (overId) {
      const overIndex = others.findIndex((t) => t.id === overId);
      if (overIndex !== -1) index = overIndex;
    }
    ordered = [...others];
    ordered.splice(index, 0, active);
  }

  // Sort values available to this column: the ones already in use, plus one
  // for the dragged card (its own if it was already here, otherwise a new one
  // past the end).
  const slots = others.map((t) => t.sort_order);
  if (active.status === targetStatus) {
    slots.push(active.sort_order);
  } else {
    slots.push(slots.length ? Math.max(...slots) + 1 : 0);
  }
  slots.sort((a, b) => a - b);
  for (let i = 1; i < slots.length; i++) {
    if (slots[i] <= slots[i - 1]) slots[i] = slots[i - 1] + 1;
  }

  const updates: OrderUpdate[] = [];
  ordered.forEach((task, i) => {
    const statusChanged = task.status !== targetStatus;
    if (task.sort_order !== slots[i] || statusChanged) {
      updates.push({
        id: task.id,
        sort_order: slots[i],
        ...(statusChanged && { status: targetStatus }),
      });
    }
  });
  return updates;
}

/** Applies order updates to a task list (used for the optimistic board state). */
export function applyOrderUpdates(tasks: Task[], updates: OrderUpdate[]): Task[] {
  const byId = new Map(updates.map((u) => [u.id, u]));
  return tasks.map((t) => {
    const u = byId.get(t.id);
    return u ? { ...t, sort_order: u.sort_order, status: u.status ?? t.status } : t;
  });
}
