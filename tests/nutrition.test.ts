import { describe, expect, it } from "vitest";
import { matchPantryIngredients, motivationForMinute, PEPTIDE_SAFETY_COPY, safeSupplementTimingLabel } from "../lib/nutrition";

describe("nutrition helpers", () => {
  it("rotates motivation predictably", () => {
    expect(motivationForMinute(0)).toBe("Stay steady.");
    expect(motivationForMinute(5)).toBe("Stay steady.");
    expect(motivationForMinute(7)).toBe("Show up for yourself.");
  });
  it("counts pantry matches case-insensitively", () => {
    expect(matchPantryIngredients([" Eggs ", "Rice"], ["eggs", "spinach", "rice"])).toBe(2);
  });
  it("uses cautious supplement timing labels", () => {
    expect(safeSupplementTimingLabel("Pre-workout")).toContain("follow the product label");
    expect(safeSupplementTimingLabel("protein powder")).toContain("Post-workout");
  });
  it("keeps peptide copy away from dosing instructions", () => {
    expect(PEPTIDE_SAFETY_COPY).toContain("does not select peptides");
    expect(PEPTIDE_SAFETY_COPY).toContain("injection units");
  });
});
