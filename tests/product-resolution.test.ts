import { describe, expect, it } from "vitest";
import { confidenceLabel, portionToGrams, rankProductCandidate, scaleNutrition } from "../lib/product-resolution";
import { buildFocusPlan } from "../lib/workout-selection";

describe("product resolution", () => {
  const nutrients = { calories: 200, kilojoules: 840, protein: 20, carbohydrates: 10, sugars: 5, fat: 8, saturatedFat: 2, fibre: 4, sodium: 100 };
  it("scales nutrition from per-100g for confirmed portions", () => { expect(scaleNutrition(nutrients, 50).calories).toBe(100); expect(scaleNutrition(nutrients, 150).protein).toBe(30); });
  it("supports portions without assuming a full package", () => { expect(portionToGrams(0.5, "serve", 200)).toBe(100); expect(portionToGrams(1, "half-pack", 400)).toBe(200); });
  it("labels low-confidence matches for confirmation", () => { expect(confidenceLabel(55)).toBe("Confirm carefully"); expect(confidenceLabel(90)).toBe("High confidence"); });
  it("ranks exact barcode and Australian matches", () => { expect(rankProductCandidate({ barcode: "123", country: "Australia" }, { id: "123", name: "Oats", country: "Australia", source: "OFF", confidence: 90 })).toBe(65); });
});

describe("workout selection", () => {
  it("regenerates exercises for a changed focus", () => { const plan = buildFocusPlan("Legs", 40); expect(plan.exercises).toContain("Goblet squat"); expect(plan.exercises).not.toContain("Dumbbell bench press"); });
  it("filters a limitation conservatively", () => { const plan = buildFocusPlan("Legs", 30, "knee discomfort"); expect(plan.changedForLimitation).toBe(true); expect(plan.exercises).not.toContain("Goblet squat"); });
});
