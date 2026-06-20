import { describe, expect, it } from "vitest";
import { isOpenNow } from "./overpass";

describe("isOpenNow", () => {
  it("returns null when there's no opening_hours value", () => {
    expect(isOpenNow(undefined)).toBeNull();
  });

  it("treats 24/7 as always open", () => {
    expect(isOpenNow("24/7")).toBe(true);
  });

  it("returns true when now falls inside a Mo-Fr time range", () => {
    // Wednesday 10:00 falls inside Mo-Fr 09:00-17:00.
    const wednesday10am = new Date(2026, 5, 17, 10, 0); // 2026-06-17 is a Wednesday
    expect(isOpenNow("Mo-Fr 09:00-17:00", wednesday10am)).toBe(true);
  });

  it("returns false when now falls outside a Mo-Fr time range on a matching day", () => {
    const wednesday8pm = new Date(2026, 5, 17, 20, 0);
    expect(isOpenNow("Mo-Fr 09:00-17:00", wednesday8pm)).toBe(false);
  });

  it("returns null (not false) when today isn't mentioned by any rule — the data simply doesn't say, so 'unknown' is more honest than asserting closed", () => {
    // Sunday isn't in Mo-Fr.
    const sunday10am = new Date(2026, 5, 21, 10, 0); // 2026-06-21 is a Sunday
    expect(isOpenNow("Mo-Fr 09:00-17:00", sunday10am)).toBeNull();
  });

  it("handles multiple semicolon-separated rules", () => {
    const saturday10am = new Date(2026, 5, 20, 10, 0); // Saturday
    expect(isOpenNow("Mo-Fr 09:00-17:00; Sa 09:00-12:00", saturday10am)).toBe(true);

    const saturday2pm = new Date(2026, 5, 20, 14, 0);
    expect(isOpenNow("Mo-Fr 09:00-17:00; Sa 09:00-12:00", saturday2pm)).toBe(false);
  });

  it("handles comma-separated days within one rule", () => {
    const saturday10am = new Date(2026, 5, 20, 10, 0);
    expect(isOpenNow("Sa,Su 10:00-14:00", saturday10am)).toBe(true);
  });

  it("returns null for a format it can't parse at all", () => {
    expect(isOpenNow("by appointment only")).toBeNull();
  });
});
