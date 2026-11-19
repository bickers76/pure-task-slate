import { HttpError, now } from "./http";

export const STATUSES = ["Backlog", "In Progress", "Review", "Done"];
export const PRIORITIES = ["Low", "Medium", "High"];
export const ASSIGNEES = ["Wayne", "Mervbot"];

type Row = Record<string, unknown>;
type Values = Record<string, string | number | null>;

const TASK_SELECT = `
  SELECT t.*, p.name AS p_name, p.created_at AS p_created_at, p.updated_at AS p_updated_at
  FROM tasks t JOIN projects p ON p.id = t.project_id`;

function toTask(row: Row) {
  const { p_name, p_created_at, p_updated_at, tags, ...task } = row;
  return {
    ...task,
    tags: typeof tags === "string" ? JSON.parse(tags) : null,
    project: { id: row.project_id, name: p_name, created_at: p_created_at, updated_at: p_updated_at },
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function text(value: unknown, field: string, max: number, required = false): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (typeof value !== "string") throw new HttpError(400, `${field} must be text`);
  const trimmed = value.trim();
  if (!trimmed && required) throw new HttpError(400, `${field} is required`);
  if (trimmed.length > max) throw new HttpError(400, `${field} must be ${max} characters or fewer`);
  return trimmed || null;
}

function oneOf(value: unknown, field: string, allowed: string[]): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

/** Fields a task update may change. The bot API uses this list as-is. */
export const UPDATABLE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "assignee",
  "due_date",
  "tags",
  "deliverable",
  "review_feedback",
  "blocked_reason",
  "sort_order",
];

/** Validates whichever task fields are present in `data` and returns column values. */
function taskValues(data: Row, fields: string[]): Values {
  const values: Values = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(data, field) || data[field] === undefined) continue;
    const value = data[field];
    switch (field) {
      case "title":
        values.title = text(value, "title", 500, true);
        break;
      case "description":
        values.description = text(value, "description", 20_000);
        break;
      case "deliverable":
        values.deliverable = text(value, "deliverable", 2_000);
        break;
      case "review_feedback":
        values.review_feedback = text(value, "review_feedback", 5_000);
        break;
      case "blocked_reason":
        values.blocked_reason = text(value, "blocked_reason", 5_000);
        break;
      case "status":
        values.status = oneOf(value, "status", STATUSES);
        break;
      case "priority":
        values.priority = oneOf(value, "priority", PRIORITIES);
        break;
      case "assignee":
        values.assignee = oneOf(value, "assignee", ASSIGNEES);
        break;
      case "due_date":
        if (value === null || value === "") values.due_date = null;
        else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) values.due_date = value;
        else throw new HttpError(400, "due_date must be YYYY-MM-DD");
        break;
      case "tags":
        if (value === null) values.tags = null;
        else if (
          Array.isArray(value) &&
          value.length <= 20 &&
          value.every((t) => typeof t === "string" && t.trim() && t.length <= 50)
        ) {
          values.tags = value.length ? JSON.stringify(value.map((t: string) => t.trim())) : null;
        } else throw new HttpError(400, "tags must be a list of up to 20 short strings");
        break;
      case "sort_order":
        if (typeof value !== "number" || !Number.isInteger(value)) {
          throw new HttpError(400, "sort_order must be a whole number");
        }
        values.sort_order = value;
        break;
      case "project_id":
        values.project_id = text(value, "project_id", 100, true);
        break;
    }
  }
  return values;
}

async function requireProject(db: D1Database, id: unknown) {
  if (typeof id !== "string" || !id) throw new HttpError(400, "project_id is required");
  const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(id).first();
  if (!project) throw new HttpError(400, "That project doesn't exist");
  return id;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listProjects(db: D1Database) {
  return (await db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all()).results;
}

export async function getProject(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
}

export async function createProject(db: D1Database, data: Row) {
  const name = text(data.name, "name", 200, true)!;
  const id = crypto.randomUUID();
  const at = now();
  await db
    .prepare("INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .bind(id, name, at, at)
    .run();
  return getProject(db, id);
}

export async function renameProject(db: D1Database, id: string, data: Row) {
  const name = text(data.name, "name", 200, true)!;
  const result = await db
    .prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?")
    .bind(name, now(), id)
    .run();
  if (!result.meta.changes) throw new HttpError(404, "Project not found");
  return getProject(db, id);
}

/** Deletes a project and, through the foreign key, its tasks and their comments. */
export async function deleteProject(db: D1Database, id: string) {
  await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function listTasks(
  db: D1Database,
  filters: { project_id?: string | null; status?: string | null; assignee?: string | null } = {}
) {
  const where: string[] = [];
  const params: string[] = [];
  if (filters.project_id) {
    where.push("t.project_id = ?");
    params.push(filters.project_id);
  }
  if (filters.status) {
    where.push("t.status = ?");
    params.push(oneOf(filters.status, "status", STATUSES));
  }
  if (filters.assignee) {
    where.push("t.assignee = ?");
    params.push(oneOf(filters.assignee, "assignee", ASSIGNEES));
  }
  const sql = `${TASK_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY t.sort_order ASC, t.created_at DESC`;
  const { results } = await db.prepare(sql).bind(...params).all();
  return results.map(toTask);
}

export async function getTask(db: D1Database, id: string) {
  const row = await db.prepare(`${TASK_SELECT} WHERE t.id = ?`).bind(id).first();
  return row ? toTask(row) : null;
}

async function insertTask(db: D1Database, values: Values) {
  const columns = Object.keys(values);
  await db
    .prepare(`INSERT INTO tasks (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .bind(...Object.values(values))
    .run();
  return getTask(db, values.id as string);
}

export async function createTask(db: D1Database, data: Row, defaultAssignee = "Mervbot") {
  const projectId = await requireProject(db, data.project_id);
  const values = taskValues(data, UPDATABLE_FIELDS);
  if (!values.title) throw new HttpError(400, "title is required");

  // New tasks go to the top of the board unless a position is given.
  if (values.sort_order === undefined) {
    const top = await db.prepare("SELECT MIN(sort_order) AS m FROM tasks").first<{ m: number | null }>();
    values.sort_order = top?.m === null || top?.m === undefined ? 0 : top.m - 1;
  }

  const at = now();
  const status = (values.status as string) ?? "Backlog";
  return insertTask(db, {
    priority: "Medium",
    assignee: defaultAssignee,
    ...values,
    status,
    id: crypto.randomUUID(),
    project_id: projectId,
    completed_at: status === "Done" ? at : null,
    created_at: at,
    updated_at: at,
  });
}

/** Puts back a task that was just deleted, keeping its id, position and creation time. */
export async function restoreTask(db: D1Database, data: Row) {
  const id = text(data.id, "id", 100, true)!;
  if (await db.prepare("SELECT id FROM tasks WHERE id = ?").bind(id).first()) {
    throw new HttpError(409, "That task already exists");
  }
  const projectId = await requireProject(db, data.project_id);
  const values = taskValues(data, UPDATABLE_FIELDS);
  if (!values.title) throw new HttpError(400, "title is required");
  const at = now();
  const createdAt =
    typeof data.created_at === "string" && !Number.isNaN(Date.parse(data.created_at)) ? data.created_at : at;
  const status = (values.status as string) ?? "Backlog";
  return insertTask(db, {
    priority: "Medium",
    assignee: "Mervbot",
    sort_order: 0,
    ...values,
    status,
    id,
    project_id: projectId,
    completed_at: status === "Done" ? at : null,
    created_at: createdAt,
    updated_at: at,
  });
}

function updateStatement(db: D1Database, id: string, values: Values) {
  const columns = Object.keys(values);
  return db
    .prepare(`UPDATE tasks SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`)
    .bind(...Object.values(values), id);
}

/** Status-dependent columns that follow from a change, given the task's current status. */
function withStatusEffects(values: Values, currentStatus: string, at: string): Values {
  const next: Values = { ...values, updated_at: at };
  if (typeof values.status === "string" && values.status !== currentStatus) {
    if (values.status === "Done") next.completed_at = at;
    else if (currentStatus === "Done") next.completed_at = null;
    // Entering Review starts a fresh review round.
    if (values.status === "Review" && values.review_feedback === undefined) next.review_feedback = null;
  }
  return next;
}

export async function updateTask(db: D1Database, id: string, data: Row, fields = UPDATABLE_FIELDS) {
  const values = taskValues(data, fields);
  if (Object.keys(values).length === 0) {
    throw new HttpError(400, `No updatable fields provided. Allowed: ${fields.join(", ")}`);
  }
  const existing = await db.prepare("SELECT status FROM tasks WHERE id = ?").bind(id).first<{ status: string }>();
  if (!existing) throw new HttpError(404, "Task not found");
  if (values.project_id) await requireProject(db, values.project_id);

  await updateStatement(db, id, withStatusEffects(values, existing.status, now())).run();
  return getTask(db, id);
}

/** Applies a drag-and-drop result: several position/status changes, all or nothing. */
export async function reorderTasks(db: D1Database, data: Row) {
  const updates = data.updates;
  if (!Array.isArray(updates) || updates.length === 0 || updates.length > 500) {
    throw new HttpError(400, "updates must be a list of 1 to 500 changes");
  }
  const ids = updates.map((u) => (u && typeof u.id === "string" ? u.id : ""));
  if (ids.some((id) => !id)) throw new HttpError(400, "Every update needs an id");

  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await db
    .prepare(`SELECT id, status FROM tasks WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: string; status: string }>();
  const current = new Map(results.map((r) => [r.id, r.status]));

  const at = now();
  const statements = updates
    .filter((u) => current.has(u.id))
    .map((u) => {
      const values = taskValues(u, ["sort_order", "status"]);
      return updateStatement(db, u.id, withStatusEffects(values, current.get(u.id)!, at));
    });
  if (statements.length) await db.batch(statements);
}

export async function deleteTask(db: D1Database, id: string) {
  await db.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function listComments(db: D1Database, taskId: string) {
  return (
    await db.prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC").bind(taskId).all()
  ).results;
}

export async function addComment(db: D1Database, taskId: string, author: string, body: unknown) {
  const cleanBody = text(body, "body", 10_000, true)!;
  oneOf(author, "author", ASSIGNEES);
  if (!(await db.prepare("SELECT id FROM tasks WHERE id = ?").bind(taskId).first())) {
    throw new HttpError(404, "Task not found");
  }
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO task_comments (id, task_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, taskId, author, cleanBody, now())
    .run();
  return db.prepare("SELECT * FROM task_comments WHERE id = ?").bind(id).first();
}
