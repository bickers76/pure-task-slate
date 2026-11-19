import { HttpError, json, now, randomHex, readJson, sha256Hex } from "./http";
import { getSessionUser, handleAuth } from "./auth";
import { handleBot } from "./bot";
import * as data from "./data";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

/** The person signed in to the app; the bot is the other party on the board. */
const HUMAN = "Wayne";

async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method;

  // Agents authenticate with an API key, not a browser session.
  if (path === "/api/bot") {
    try {
      return await handleBot(request, env, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ success: false, error: err.message }, err.status);
      throw err;
    }
  }

  // Everything else is called by the app itself. Refuse state-changing
  // requests that come from another site.
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("Origin");
    if (origin && new URL(origin).host !== request.headers.get("Host")) {
      throw new HttpError(403, "Cross-site request refused");
    }
  }

  const auth = await handleAuth(request, env, path);
  if (auth) return auth;

  const user = await getSessionUser(request, env);
  if (!user) throw new HttpError(401, "Not signed in");

  const db = env.DB;
  const seg = path.split("/").slice(2); // drop "" and "api"
  const [resource, id, sub] = seg;

  if (resource === "projects") {
    if (!id) {
      if (method === "GET") return json(await data.listProjects(db));
      if (method === "POST") return json(await data.createProject(db, await readJson(request)), 201);
    } else if (!sub) {
      if (method === "GET") {
        const project = await data.getProject(db, id);
        if (!project) throw new HttpError(404, "Project not found");
        return json(project);
      }
      if (method === "PATCH") return json(await data.renameProject(db, id, await readJson(request)));
      if (method === "DELETE") {
        await data.deleteProject(db, id);
        return json({ id });
      }
    }
  }

  if (resource === "tasks") {
    if (!id) {
      if (method === "GET") return json(await data.listTasks(db, { project_id: url.searchParams.get("project_id") }));
      if (method === "POST") return json(await data.createTask(db, await readJson(request)), 201);
    } else if (id === "reorder" && method === "POST") {
      await data.reorderTasks(db, await readJson(request));
      return json({ ok: true });
    } else if (id === "restore" && method === "POST") {
      return json(await data.restoreTask(db, await readJson(request)), 201);
    } else if (!sub) {
      if (method === "GET") {
        const task = await data.getTask(db, id);
        if (!task) throw new HttpError(404, "Task not found");
        return json(task);
      }
      if (method === "PATCH") {
        return json(await data.updateTask(db, id, await readJson(request), [...data.UPDATABLE_FIELDS, "project_id"]));
      }
      if (method === "DELETE") {
        await data.deleteTask(db, id);
        return json({ id });
      }
    } else if (sub === "comments") {
      if (method === "GET") return json(await data.listComments(db, id));
      if (method === "POST") {
        const body = await readJson(request);
        return json(await data.addComment(db, id, HUMAN, body.body), 201);
      }
    }
  }

  // API keys for the bot API. The full key is returned once, at creation.
  if (resource === "keys") {
    if (!id && method === "GET") {
      const { results } = await db
        .prepare("SELECT id, name, agent, key_hint, created_at, last_used_at FROM api_keys ORDER BY created_at DESC")
        .all();
      return json(results);
    }
    if (!id && method === "POST") {
      const body = await readJson(request);
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
      if (!name) throw new HttpError(400, "Give the key a name");
      const agent = typeof body.agent === "string" ? body.agent : "Mervbot";
      if (!data.ASSIGNEES.includes(agent)) throw new HttpError(400, "Unknown agent");
      const key = `gsd_${randomHex(32)}`;
      const row = {
        id: crypto.randomUUID(),
        name,
        agent,
        key_hint: `${key.slice(0, 8)}…${key.slice(-4)}`,
        created_at: now(),
        last_used_at: null,
      };
      await db
        .prepare("INSERT INTO api_keys (id, name, agent, key_hash, key_hint, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(row.id, row.name, row.agent, await sha256Hex(key), row.key_hint, row.created_at)
        .run();
      return json({ ...row, key }, 201);
    }
    if (id && !sub && method === "DELETE") {
      await db.prepare("DELETE FROM api_keys WHERE id = ?").bind(id).run();
      return json({ id });
    }
  }

  throw new HttpError(404, "Not found");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      return await handleApi(request, env, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error("Unhandled API error", err);
      return json({ error: "Something went wrong" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
