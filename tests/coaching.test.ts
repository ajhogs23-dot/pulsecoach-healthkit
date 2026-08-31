import { describe, expect, it } from "vitest";
import { healthConnectionLabel, nutritionPrompt, workoutFocus } from "../lib/coaching";

describe("VELTURA coaching helpers", () => {
  it("keeps nutrition guidance aligned to a strength goal and dietary preference", () => {
    expect(nutritionPrompt("strength", true)).toContain("beans, tofu, lentils");
    expect(nutritionPrompt("strength", true)).toContain("supports training");
  });

  it("adapts workout language to available equipment", () => {
    expect(workoutFocus("fitness", "bodyweight")).toContain("push, pull, squat, hinge, and carry");
    expect(workoutFocus("strength", "dumbbells")).toContain("longer rests");
  });

  it("does not imply a health connection when permission is absent", () => {
    expect(healthConnectionLabel(false)).toBe("Connect Apple Health");
    expect(healthConnectionLabel(true)).toBe("Apple Health connected");
  });
});
