import { describe, expect, it } from "vitest";
import { exerciseNameScore, exerciseSearchTerms, normaliseExerciseName } from "../lib/exercise-media-matching";

describe("exercise media matching", () => {
  it("normalises punctuation and case", () => {
    expect(normaliseExerciseName("Captain's Chair Knee-Raise")).toBe("captain s chair knee raise");
  });

  it("adds known aliases and a simplified search", () => {
    expect(exerciseSearchTerms("Barbell bench press")).toEqual(expect.arrayContaining(["Barbell bench press", "Bench press"]));
  });

  it("matches equipment-qualified names", () => {
    expect(exerciseNameScore("Barbell bench press", "Bench press")).toBeGreaterThanOrEqual(70);
    expect(exerciseNameScore("Dumbbell biceps curl", "Biceps curl")).toBeGreaterThanOrEqual(70);
  });

  it("rejects unrelated movements", () => {
    expect(exerciseNameScore("Bench press", "Standing calf raise")).toBe(0);
  });
});
