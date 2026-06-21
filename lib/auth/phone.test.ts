import { describe, expect, it } from "vitest";
import { maskPhone, normalizeIndianPhone } from "./phone";

describe("normalizeIndianPhone", () => {
  it("accepts a plain 10-digit number", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
  });

  it("accepts numbers with a +91 country code", () => {
    expect(normalizeIndianPhone("+919876543210")).toBe("+919876543210");
  });

  it("accepts numbers with a 91 prefix but no plus", () => {
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
  });

  it("accepts numbers with a leading trunk 0", () => {
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
  });

  it("strips spaces and dashes", () => {
    expect(normalizeIndianPhone("98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
  });

  it("rejects numbers not starting with 6-9", () => {
    expect(normalizeIndianPhone("5876543210")).toBeNull();
    expect(normalizeIndianPhone("1876543210")).toBeNull();
  });

  it("rejects numbers with the wrong length", () => {
    expect(normalizeIndianPhone("987654321")).toBeNull();
    expect(normalizeIndianPhone("98765432109")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(normalizeIndianPhone("not-a-phone")).toBeNull();
    expect(normalizeIndianPhone("")).toBeNull();
  });
});

describe("maskPhone", () => {
  it("shows the country code and only the last 4 digits", () => {
    expect(maskPhone("+919876543210")).toBe("+91 ••••• 3210");
  });
});
