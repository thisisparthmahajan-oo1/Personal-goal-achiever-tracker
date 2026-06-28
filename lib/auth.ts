// Edge-runtime-safe session signing for the single-user passcode gate.
// HMAC-SHA256 over a timestamp, encoded as base64url.
// Format: `<timestamp_ms>.<base64url_signature>`

const enc = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function signSession(
  secret: string,
  issuedAtMs: number
): Promise<string> {
  const payload = String(issuedAtMs);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a session cookie value and confirm it's within `maxAgeMs` of now.
 * Returns false for any malformed / tampered / expired token.
 */
export async function verifySession(
  secret: string,
  value: string,
  maxAgeMs: number
): Promise<boolean> {
  if (!secret || !value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const ts = Number(payload);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > maxAgeMs) return false;
  const expected = await hmac(secret, payload);
  return constantTimeEqual(expected, sig);
}

export const SESSION_COOKIE_NAME = "tracker_session";
export const SESSION_MAX_AGE_DAYS = 30;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
