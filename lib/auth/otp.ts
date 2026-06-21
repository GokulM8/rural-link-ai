import { createHash, randomInt } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

// Only the hash is ever persisted (see supabase/schema.sql's otp_codes.code_hash)
// so a database read alone can never reveal a valid code.
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
