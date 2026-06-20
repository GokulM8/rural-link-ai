import { describe, expect, it } from "vitest";
import { parseJsonArray } from "./aiProviders";

describe("parseJsonArray", () => {
  it("parses a bare JSON array of strings", () => {
    expect(parseJsonArray('["a", "b", "c"]', 3)).toEqual(["a", "b", "c"]);
  });

  it("parses { values: [...] } root shape", () => {
    expect(parseJsonArray('{"values": ["a", "b"]}', 2)).toEqual(["a", "b"]);
  });

  it("parses { tips: [...] } root shape", () => {
    expect(parseJsonArray('{"tips": ["a", "b"]}', 2)).toEqual(["a", "b"]);
  });

  it("re-stringifies nested objects instead of dropping them (regression: Groq returns objects, not strings, despite being asked for JSON strings)", () => {
    const text = '[{"found":false,"phone":null},{"found":true,"phone":"123"}]';
    const result = parseJsonArray(text, 2);
    expect(result).not.toBeNull();
    expect(JSON.parse(result![0]!)).toEqual({ found: false, phone: null });
    expect(JSON.parse(result![1]!)).toEqual({ found: true, phone: "123" });
  });

  it("pads missing items with null when the array is shorter than count", () => {
    expect(parseJsonArray('["a"]', 3)).toEqual(["a", null, null]);
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonArray("not json", 2)).toBeNull();
  });

  it("returns null when the root shape isn't recognized", () => {
    expect(parseJsonArray('{"unexpected": "shape"}', 2)).toBeNull();
  });
});
