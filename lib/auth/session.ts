import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "rurallink_session";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_MAX_AGE_MS / 1000);

export interface SessionPayload {
  userId: string;
  phone: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

/**
 * Hand-rolled signed token rather than a JWT library — same idea (a payload
 * plus an HMAC over it), but this app has no other use for a JWT dependency.
 * Format: base64url(payload JSON) + "." + base64url(HMAC-SHA256 signature).
 */
export function signSession(userId: string, phone: string): string {
  const payload: SessionPayload = { userId, phone, exp: Date.now() + SESSION_MAX_AGE_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
