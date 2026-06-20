import { describe, expect, it } from "vitest";
import type { ServiceCategory } from "./overpass";
import { CATEGORY_HELPLINE, CATEGORY_TYPICAL_HOURS } from "./serviceDefaults";

const ALL_CATEGORIES: ServiceCategory[] = ["hospital", "clinic", "bank", "atm", "school", "government"];

describe("serviceDefaults", () => {
  it("has a non-empty helpline for every service category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(CATEGORY_HELPLINE[category]).toBeTruthy();
    }
  });

  it("has non-empty typical hours for every service category", () => {
    for (const category of ALL_CATEGORIES) {
      expect(CATEGORY_TYPICAL_HOURS[category]).toBeTruthy();
    }
  });
});
