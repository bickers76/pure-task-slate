export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Fired when the server says the session is gone, so the app can show sign-in. */
export const SESSION_EXPIRED_EVENT = "gsd:session-expired";

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/** Calls the app's own API (same origin; the session travels in a cookie). */
export async function api<T>(path: string, { method = "GET", body }: ApiOptions = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, payload?.error ?? "Something went wrong");
  }
  return payload as T;
}
