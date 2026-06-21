import { createHmac } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-production";
});

describe("signSession / verifySession", () => {
  it("round-trips the userId and phone", () => {
    const token = signSession("user-1", "+919876543210");
    const session = verifySession(token);
    expect(session?.userId).toBe("user-1");
    expect(session?.phone).toBe("+919876543210");
  });

  it("rejects a tampered payload", () => {
    const token = signSession("user-1", "+919876543210");
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "attacker", phone: "+910000000000", exp: Date.now() + 100000 })).toString("base64url");
    expect(verifySession(`${tamperedPayload}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signSession("user-1", "+919876543210");
    const [payloadB64] = token.split(".");
    expect(verifySession(`${payloadB64}.not-a-real-signature`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const payload = JSON.stringify({ userId: "user-1", phone: "+919876543210", exp: Date.now() - 1000 });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const signature = createHmac("sha256", process.env.SESSION_SECRET!).update(payloadB64).digest("base64url");
    expect(verifySession(`${payloadB64}.${signature}`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySession("not-a-token")).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession(null)).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });
});
