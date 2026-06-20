import { describe, expect, it } from "vitest";
import { isLocaleCode, suggestLocaleFromState } from "./locale";

describe("suggestLocaleFromState", () => {
  it("maps known states to their expected locale", () => {
    expect(suggestLocaleFromState("Andhra Pradesh")).toBe("te");
    expect(suggestLocaleFromState("Tamil Nadu")).toBe("ta");
    expect(suggestLocaleFromState("Karnataka")).toBe("kn");
    expect(suggestLocaleFromState("Maharashtra")).toBe("mr");
    expect(suggestLocaleFromState("West Bengal")).toBe("bn");
    expect(suggestLocaleFromState("Odisha")).toBe("or");
    expect(suggestLocaleFromState("Uttar Pradesh")).toBe("hi");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(suggestLocaleFromState("  andhra pradesh  ")).toBe("te");
    expect(suggestLocaleFromState("KARNATAKA")).toBe("kn");
  });

  it("returns null for an unmapped or unknown state", () => {
    expect(suggestLocaleFromState("Kerala")).toBeNull();
    expect(suggestLocaleFromState("Nonexistent State")).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(suggestLocaleFromState(null)).toBeNull();
    expect(suggestLocaleFromState(undefined)).toBeNull();
  });
});

describe("isLocaleCode", () => {
  it("accepts all 8 supported locale codes", () => {
    for (const code of ["en", "hi", "te", "ta", "kn", "mr", "bn", "or"]) {
      expect(isLocaleCode(code)).toBe(true);
    }
  });

  it("rejects unsupported codes", () => {
    expect(isLocaleCode("fr")).toBe(false);
    expect(isLocaleCode("")).toBe(false);
  });
});
