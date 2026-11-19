export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(payload: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

const MAX_BODY_BYTES = 256 * 1024;

/** Reads a JSON object body, rejecting anything oversized or malformed. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large");
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export const now = () => new Date().toISOString();

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

export function randomHex(byteLength: number): string {
  return hex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256Hex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

/** Constant-time comparison of two hex strings. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  }
  return diff === 0;
}

export { hex };
