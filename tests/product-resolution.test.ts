import { describe, expect, it } from "vitest";
import { confidenceLabel, portionToGrams, rankProductCandidate, scaleNutrition } from "../lib/product-resolution";
import { applyReadinessVolume, buildFocusPlan, contraindicationConfirmation, contraindicationWarning, isExerciseContraindicated, limitationForPainArea } from "../lib/workout-selection";

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
  it("excludes push-ups and other shoulder-loading movements for shoulder pain", () => {
    const plan = buildFocusPlan("Chest", 30, "right shoulder pain", "Low");
    expect(plan.limitationAcknowledged).toBe(true);
    expect(plan.exercises).not.toContain("Incline push-up");
    expect(plan.exercises).not.toContain("Dumbbell bench press");
    expect(isExerciseContraindicated("Push-up", "shoulder pain", "Chest")).toBe(true);
    expect(isExerciseContraindicated("Dumbbell biceps curl", "shoulder pain", "Arms")).toBe(false);
  });
  it("reduces readiness volume after receiving the pain-safe exercise list", () => {
    const painSafe = ["Dumbbell biceps curl", "Hammer curl", "Cable curl"];
    expect(applyReadinessVolume(painSafe, "Low")).toEqual(["Dumbbell biceps curl", "Hammer curl"]);
  });
  it("maps structured pain choices to the existing safety-filter text", () => {
    expect(limitationForPainArea("Shoulder")).toBe("shoulder pain");
    expect(limitationForPainArea("Knee")).toBe("knee pain");
    expect(limitationForPainArea("None")).toBe("");
    expect(limitationForPainArea("Other", "  pain reaching overhead  ")).toBe("pain reaching overhead");
  });
  it("provides explicit shoulder-pain warnings before a contraindicated choice", () => {
    expect(contraindicationWarning("shoulder pain")).toBe("Avoid today — may aggravate your shoulder.");
    expect(contraindicationConfirmation("Push-up", "shoulder pain")).toBe("You reported shoulder pain. Push-up may aggravate it. Stop if it hurts.");
  });
});
