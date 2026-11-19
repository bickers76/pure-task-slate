// End-to-end check of the Worker API against a local `wrangler dev`.
// Usage: npm run test:api   (starts from an empty local database)
import { execSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { rmSync } from "node:fs";

const PORT = 8799;
const BASE = `http://localhost:${PORT}`;
const sh = (cmd) => execSync(cmd, { stdio: "pipe" }).toString();

let failures = 0;
const check = (name, cond, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : " " + detail}`);
};

let cookie = "";
async function call(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...(auth && cookie && { Cookie: cookie }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { status: res.status, body: await res.json().catch(() => null) };
}

rmSync(".wrangler/state", { recursive: true, force: true });
sh("npx wrangler d1 migrations apply pure-task-slate --local");
const setupCode = randomBytes(12).toString("hex");
const codeHash = createHash("sha256").update(setupCode).digest("hex");
sh(`npx wrangler d1 execute pure-task-slate --local --command "INSERT INTO settings (key, value) VALUES ('setup_code_hash', '${codeHash}')"`);

const dev = spawn("npx", ["wrangler", "dev", "--port", String(PORT)], { stdio: "pipe", detached: true });
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/api/auth/session")).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }

  // --- setup and sign-in ---
  let r = await call("/api/auth/session");
  check("fresh instance asks for setup", r.body.needsSetup === true && r.body.user === null);
  r = await call("/api/tasks");
  check("data needs a session", r.status === 401);
  r = await call("/api/auth/setup", { method: "POST", body: { code: "wrong", email: "owner@example.com", password: "correct horse battery" } });
  check("setup rejects a wrong code", r.status === 403);
  r = await call("/api/auth/setup", { method: "POST", body: { code: setupCode, email: "owner@example.com", password: "short" } });
  check("setup rejects a short password", r.status === 400);
  r = await call("/api/auth/setup", { method: "POST", body: { code: setupCode, email: "Owner@Example.com", password: "correct horse battery" } });
  check("setup creates the owner and signs in", r.status === 200 && r.body.user.email === "owner@example.com" && cookie.startsWith("gsd_session="));
  r = await call("/api/auth/setup", { method: "POST", body: { code: setupCode, email: "other@example.com", password: "correct horse battery" } });
  check("setup can't run twice", r.status === 403);
  r = await call("/api/projects", { method: "POST", body: { name: "x" }, headers: { Origin: "https://evil.example" } });
  check("cross-site writes are refused", r.status === 403);

  // --- projects and tasks ---
  r = await call("/api/projects", { method: "POST", body: { name: "Newsletter" } });
  const project = r.body;
  check("create project", r.status === 201 && project.name === "Newsletter");
  r = await call(`/api/projects/${project.id}`, { method: "PATCH", body: { name: "Weekly newsletter" } });
  check("rename project", r.body.name === "Weekly newsletter");
  r = await call("/api/tasks", { method: "POST", body: { project_id: project.id, title: " First ", tags: ["a", "b"], due_date: "2026-12-01" } });
  const first = r.body;
  check("create task with defaults", r.status === 201 && first.title === "First" && first.status === "Backlog" && first.assignee === "Mervbot" && first.tags.length === 2 && first.project.name === "Weekly newsletter");
  r = await call("/api/tasks", { method: "POST", body: { project_id: project.id, title: "Second" } });
  const second = r.body;
  check("new tasks go to the top", second.sort_order < first.sort_order);
  r = await call("/api/tasks", { method: "POST", body: { project_id: "nope", title: "x" } });
  check("unknown project is rejected", r.status === 400);
  r = await call("/api/tasks", { method: "POST", body: { project_id: project.id, title: "x", status: "Nope" } });
  check("invalid status is rejected", r.status === 400);
  r = await call(`/api/tasks/${first.id}`, { method: "PATCH", body: { status: "Done" } });
  check("completing stamps completed_at", r.body.status === "Done" && !!r.body.completed_at);
  r = await call(`/api/tasks/${first.id}`, { method: "PATCH", body: { status: "In Progress", review_feedback: "Fix intro" } });
  check("reopening clears completed_at", r.body.completed_at === null && r.body.review_feedback === "Fix intro");
  r = await call(`/api/tasks/${first.id}`, { method: "PATCH", body: { status: "Review" } });
  check("entering Review clears old feedback", r.body.review_feedback === null);
  r = await call(`/api/tasks/${first.id}`, { method: "PATCH", body: { id: "hacked", created_at: "x" } });
  check("non-updatable fields are refused", r.status === 400);
  r = await call("/api/tasks/reorder", { method: "POST", body: { updates: [{ id: first.id, sort_order: 5, status: "Done" }, { id: second.id, sort_order: 6 }] } });
  r = await call(`/api/tasks?project_id=${project.id}`);
  const byId = Object.fromEntries(r.body.map((t) => [t.id, t]));
  check("reorder applies positions and status", byId[first.id].sort_order === 5 && byId[first.id].status === "Done" && !!byId[first.id].completed_at && byId[second.id].sort_order === 6);
  r = await call(`/api/tasks/${second.id}/comments`, { method: "POST", body: { body: "Looks good", author: "Mervbot" } });
  check("app comments are always from the human", r.status === 201 && r.body.author === "Wayne");
  await call(`/api/tasks/${second.id}`, { method: "DELETE" });
  r = await call("/api/tasks/restore", { method: "POST", body: second });
  check("deleted task can be restored with its id", r.status === 201 && r.body.id === second.id && r.body.created_at === second.created_at);

  // --- API keys and bot API ---
  r = await call("/api/bot", { method: "POST", body: { action: "list" }, auth: false });
  check("bot API needs a key", r.status === 401 && r.body.success === false);
  r = await call("/api/keys", { method: "POST", body: { name: "Mervbot" } });
  const key = r.body.key;
  check("create API key returns it once", r.status === 201 && key.startsWith("gsd_"));
  r = await call("/api/keys");
  check("key list never includes the key", r.body.length === 1 && !("key" in r.body[0]) && !("key_hash" in r.body[0]));
  const bot = (body) => call("/api/bot", { method: "POST", body, auth: false, headers: { Authorization: `Bearer ${key}` } });
  r = await bot({ action: "list-projects" });
  check("bot: list-projects", r.body.success && r.body.data.length === 1);
  r = await bot({ action: "create", data: { project_id: project.id, title: "From bot", priority: "High" } });
  const botTask = r.body.data;
  check("bot: create", r.body.success && botTask.assignee === "Mervbot" && botTask.priority === "High");
  r = await bot({ action: "update", id: botTask.id, data: { blocked_reason: "Need login", project_id: "other", id: "x" } });
  check("bot: update ignores fields outside the allowed list", r.body.success && r.body.data.blocked_reason === "Need login" && r.body.data.project_id === project.id && r.body.data.id === botTask.id);
  r = await bot({ action: "update", id: botTask.id, data: { status: "Review", deliverable: "https://example.com/d" } });
  check("bot: hand over for review", r.body.data.status === "Review");
  r = await bot({ action: "add-comment", id: botTask.id, data: { body: "Draft ready" } });
  check("bot: add-comment", r.body.success && r.body.data.author === "Mervbot");
  r = await bot({ action: "get", id: botTask.id });
  check("bot: get includes comments", r.body.data.comments.length === 1 && r.body.data.project.id === project.id);
  r = await bot({ action: "list", status: "Review", assignee: "Mervbot" });
  check("bot: list with filters", r.body.data.length === 1 && r.body.data[0].id === botTask.id);
  r = await bot({ action: "nope" });
  check("bot: unknown action", r.status === 400 && r.body.success === false);
  r = await bot({ action: "delete", id: botTask.id });
  check("bot: delete", r.body.success);
  const keyId = (await call("/api/keys")).body[0];
  check("key use is recorded", !!keyId.last_used_at);
  await call(`/api/keys/${keyId.id}`, { method: "DELETE" });
  r = await bot({ action: "list" });
  check("revoked key stops working", r.status === 401);

  // --- cascade, sign-out, sign-in ---
  await call(`/api/projects/${project.id}`, { method: "DELETE" });
  r = await call("/api/tasks");
  check("deleting a project removes its tasks", r.body.length === 0);
  await call("/api/auth/logout", { method: "POST" });
  r = await call("/api/tasks");
  check("signed out", r.status === 401);
  r = await call("/api/auth/login", { method: "POST", body: { email: "owner@example.com", password: "wrong password!" } });
  check("wrong password is refused", r.status === 401);
  r = await call("/api/auth/login", { method: "POST", body: { email: "owner@example.com", password: "correct horse battery" } });
  check("sign in", r.status === 200 && r.body.user.email === "owner@example.com");
  const page = await fetch(BASE + "/projects/anything");
  check("unknown paths serve the app", page.status === 200 && (await page.text()).includes('<div id="root">'));
} finally {
  try { process.kill(-dev.pid); } catch { /* already gone */ }
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
