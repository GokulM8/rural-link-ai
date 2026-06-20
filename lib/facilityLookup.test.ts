import { describe, expect, it } from "vitest";
import { parseLookupItem } from "./facilityLookup";

describe("parseLookupItem", () => {
  it("only surfaces a phone number when confidence is high", () => {
    const result = parseLookupItem('{"found":true,"phone":"123","confidence":"high"}');
    expect(result.phone).toBe("123");
    expect(result.confidence).toBe("high");
  });

  it("never surfaces a phone number at medium confidence, even if found=true", () => {
    const result = parseLookupItem('{"found":true,"phone":"123","confidence":"medium"}');
    expect(result.phone).toBeNull();
  });

  it("never surfaces a phone number at low confidence", () => {
    const result = parseLookupItem('{"found":true,"phone":"123","confidence":"low"}');
    expect(result.phone).toBeNull();
  });

  it("never surfaces a phone number when found=false, regardless of confidence", () => {
    const result = parseLookupItem('{"found":false,"phone":"123","confidence":"high"}');
    expect(result.phone).toBeNull();
  });

  it("parses a nearby alternative only when both name and phone are present", () => {
    const withAlt = parseLookupItem(
      '{"found":false,"phone":null,"confidence":"low","altName":"Other Hospital","altPhone":"456"}'
    );
    expect(withAlt.alternative).toEqual({ name: "Other Hospital", phone: "456" });

    const noAlt = parseLookupItem('{"found":false,"phone":null,"confidence":"low","altName":null,"altPhone":null}');
    expect(noAlt.alternative).toBeNull();
  });

  it("falls back to low confidence and no phone for null input", () => {
    const result = parseLookupItem(null);
    expect(result).toEqual({ phone: null, confidence: "low", alternative: null });
  });

  it("falls back gracefully on malformed JSON instead of throwing", () => {
    const result = parseLookupItem("not json at all");
    expect(result).toEqual({ phone: null, confidence: "low", alternative: null });
  });

  it("treats an unrecognized confidence string as low", () => {
    const result = parseLookupItem('{"found":true,"phone":"123","confidence":"definitely"}');
    expect(result.confidence).toBe("low");
    expect(result.phone).toBeNull();
  });
});
