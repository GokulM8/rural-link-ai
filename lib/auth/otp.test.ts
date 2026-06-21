import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, OTP_LENGTH } from "./otp";

describe("generateOtp", () => {
  it("generates a zero-padded numeric code of the expected length", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtp();
      expect(code).toHaveLength(OTP_LENGTH);
      expect(code).toMatch(/^\d+$/);
    }
  });
});

describe("hashOtp", () => {
  it("is deterministic for the same code", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
  });

  it("produces different hashes for different codes", () => {
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
  });

  it("never returns the plaintext code", () => {
    expect(hashOtp("123456")).not.toBe("123456");
  });
});
