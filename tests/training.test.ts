import { describe, expect, it } from "vitest";
import { buildWeeklyPlan, shouldModifyExercise } from "../lib/training";

describe("training helpers", () => {
  it("creates a seven-day plan with the requested training count", () => {
    const plan = buildWeeklyPlan(3, ["Upper", "Lower", "Full body"]);
    expect(plan).toHaveLength(7);
    expect(plan.filter((day) => day.status === "planned")).toHaveLength(3);
    expect(plan[3].status).toBe("rest");
  });
  it("clamps invalid training counts", () => {
    expect(buildWeeklyPlan(0, []).filter((day) => day.status === "planned")).toHaveLength(1);
    expect(buildWeeklyPlan(99, []).filter((day) => day.status === "planned")).toHaveLength(7);
  });
  it("flags common limitation terms for modification review", () => {
    expect(shouldModifyExercise("right shoulder discomfort", "overhead press")).toBe(true);
    expect(shouldModifyExercise("no limitations", "walking")).toBe(false);
  });
});
