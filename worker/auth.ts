import { HttpError, hex, json, now, randomHex, readJson, safeEqual, sha256Hex } from "./http";
import type { Env } from "./index";

const SESSION_COOKIE = "gsd_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // the most Workers allows
const MIN_PASSWORD_LENGTH = 10;
const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MINUTES = 15;

export interface SessionUser {
  id: string;
  email: string;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return hex(bits);
}

const fromHex = (value: string) => new Uint8Array(value.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${hex(salt)}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false;
  return safeEqual(await pbkdf2(password, fromHex(salt), Number(iterations)), expected);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function sessionCookie(request: Request, token: string, maxAgeSeconds: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

async function startSession(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const token = randomHex(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), user.id, expires, now())
    .run();
  return json({ user, needsSetup: false }, 200, {
    "Set-Cookie": sessionCookie(request, token, SESSION_DAYS * 86_400),
  });
}

export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(await sha256Hex(token), now())
    .first<SessionUser>();
  return row ?? null;
}

async function userCount(env: Env): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
  return row?.n ?? 0;
}

function credentials(body: Record<string, unknown>): { email: string; password: string } {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) throw new HttpError(400, "Email and password are required");
  return { email, password };
}

/** Routes under /api/auth. Returns null when the path isn't one of them. */
export async function handleAuth(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path === "/api/auth/session" && request.method === "GET") {
    const user = await getSessionUser(request, env);
    return json({ user, needsSetup: !user && (await userCount(env)) === 0 });
  }

  // One-time: create the owner account. Needs the setup code and only works
  // while no account exists.
  if (path === "/api/auth/setup" && request.method === "POST") {
    if ((await userCount(env)) > 0) throw new HttpError(403, "Setup has already been completed");
    const body = await readJson(request);
    const { email, password } = credentials(body);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'setup_code_hash'").first<{
      value: string;
    }>();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!stored || !code || !safeEqual(await sha256Hex(code), stored.value)) {
      throw new HttpError(403, "That setup code isn't valid");
    }

    const user = { id: crypto.randomUUID(), email };
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").bind(
        user.id,
        email,
        await hashPassword(password),
        now()
      ),
      env.DB.prepare("DELETE FROM settings WHERE key = 'setup_code_hash'"),
    ]);
    return startSession(request, env, user);
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const windowStart = new Date(Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60_000).toISOString();
    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?")
      .bind(ip, windowStart)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= MAX_FAILED_LOGINS) {
      throw new HttpError(429, "Too many failed sign-in attempts. Try again in a few minutes.");
    }

    const { email, password } = credentials(await readJson(request));
    const row = await env.DB.prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string; email: string; password_hash: string }>();

    if (!row || !(await verifyPassword(password, row.password_hash))) {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO login_attempts (ip, at) VALUES (?, ?)").bind(ip, now()),
        env.DB.prepare("DELETE FROM login_attempts WHERE at <= ?").bind(windowStart),
      ]);
      throw new HttpError(401, "Incorrect email or password");
    }
    return startSession(request, env, { id: row.id, email: row.email });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
    }
    return json({ user: null }, 200, { "Set-Cookie": sessionCookie(request, "", 0) });
  }

  if (path === "/api/auth/password" && request.method === "POST") {
    const user = await getSessionUser(request, env);
    if (!user) throw new HttpError(401, "Not signed in");
    const body = await readJson(request);
    const current = typeof body.current === "string" ? body.current : "";
    const next = typeof body.next === "string" ? body.next : "";
    if (next.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first<{
      password_hash: string;
    }>();
    if (!row || !(await verifyPassword(current, row.password_hash))) {
      throw new HttpError(403, "Current password is incorrect");
    }
    // Change the password and sign out every other session.
    const keep = readCookie(request, SESSION_COOKIE);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(next), user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(
        user.id,
        keep ? await sha256Hex(keep) : ""
      ),
    ]);
    return json({ ok: true });
  }

  return null;
}
