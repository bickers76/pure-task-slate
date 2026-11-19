import { HttpError, json, now, readJson, sha256Hex } from "./http";
import * as data from "./data";
import type { Env } from "./index";

const ACTIONS =
  "list, get, create, update, delete, list-comments, add-comment, list-projects, create-project, delete-project";

const ok = (payload: unknown) => json({ success: true, data: payload });

function requireId(id: unknown, action: string): string {
  if (typeof id !== "string" || !id) throw new HttpError(400, `id is required for ${action}`);
  return id;
}

/**
 * POST /api/bot — the API agents use to work the board.
 * Authenticated with a key created under Settings; see docs/BOT_API.md.
 */
export async function handleBot(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") throw new HttpError(405, "Use POST");

  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Missing Authorization header");
  const key = await env.DB.prepare("SELECT id, agent FROM api_keys WHERE key_hash = ?")
    .bind(await sha256Hex(header.slice("Bearer ".length).trim()))
    .first<{ id: string; agent: string }>();
  if (!key) throw new HttpError(401, "Invalid API key");
  ctx.waitUntil(env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(now(), key.id).run());

  const body = await readJson(request);
  const payload = (typeof body.data === "object" && body.data !== null ? body.data : {}) as Record<string, unknown>;
  const db = env.DB;

  switch (body.action) {
    case "list":
      return ok(
        await data.listTasks(db, {
          project_id: body.project_id as string,
          status: body.status as string,
          assignee: body.assignee as string,
        })
      );

    case "get": {
      const id = requireId(body.id, "get");
      const task = await data.getTask(db, id);
      if (!task) throw new HttpError(404, "Task not found");
      return ok({ ...task, comments: await data.listComments(db, id) });
    }

    case "create":
      return ok(await data.createTask(db, payload, key.agent));

    case "update":
      return ok(await data.updateTask(db, requireId(body.id, "update"), payload));

    case "delete": {
      const id = requireId(body.id, "delete");
      await data.deleteTask(db, id);
      return ok({ id });
    }

    case "list-comments":
      return ok(await data.listComments(db, requireId(body.id, "list-comments")));

    case "add-comment":
      return ok(
        await data.addComment(
          db,
          requireId(body.id, "add-comment"),
          typeof payload.author === "string" ? payload.author : key.agent,
          payload.body
        )
      );

    case "list-projects":
      return ok(await data.listProjects(db));

    case "create-project":
      return ok(await data.createProject(db, payload));

    case "delete-project": {
      const id = requireId(body.id, "delete-project");
      await data.deleteProject(db, id);
      return ok({ id });
    }

    default:
      throw new HttpError(400, `Unknown action: ${String(body.action)}. Valid actions: ${ACTIONS}`);
  }
}
