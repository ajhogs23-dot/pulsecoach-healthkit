import { describe, expect, it } from "vitest";
import { calculateBmi, goalPaceLabel, hydrationGlassesLogged, routeSharingLabel, virtualChallengePoints } from "../lib/wellness";

describe("wellness helpers", () => {
  it("calculates BMI from metric inputs", () => {
    expect(calculateBmi(78, 175)).toBe(25.5);
    expect(calculateBmi(0, 175)).toBeNull();
  });
  it("labels goal pace choices without prescribing a target rate", () => {
    expect(goalPaceLabel("steady")).toBe("Balanced focus");
    expect(goalPaceLabel("slower")).toBe("Gentler routine");
  });
  it("keeps hydration logging within the display range", () => {
    expect(hydrationGlassesLogged(10)).toBe(8);
    expect(hydrationGlassesLogged(-2)).toBe(0);
  });
  it("defaults route sharing to private language", () => {
    expect(routeSharingLabel("private")).toBe("Private by default");
    expect(routeSharingLabel("totals")).toContain("totals only");
  });
  it("scores virtual challenges deterministically", () => {
    expect(virtualChallengePoints(45, 2)).toBe(245);
    expect(virtualChallengePoints(-1, -1)).toBe(0);
  });
});
