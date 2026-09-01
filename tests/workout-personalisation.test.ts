import { describe, expect, it } from "vitest";
import { completedSetCount, conflictsWithLimitation, durationForReadiness, personaliseExercises, protectCompletedSets, setsForReadiness } from "../lib/workout-personalisation";
import { EXERCISE_LIBRARY, exerciseUsesExternalLoad } from "../lib/exercise-library";

describe("workout personalisation", () => {
  it("does not ask for weight on bodyweight movements", () => {
    const pushUp = EXERCISE_LIBRARY.find((exercise) => exercise.id === "chest-push-up");
    const benchPress = EXERCISE_LIBRARY.find((exercise) => exercise.id === "chest-bench");
    expect(exerciseUsesExternalLoad(pushUp)).toBe(false);
    expect(exerciseUsesExternalLoad(benchPress)).toBe(true);
  });
  const exercises = [
    { name: "Chest press", focus: "Chest + triceps" },
    { name: "Cable fly", focus: "Chest" },
    { name: "Push-up", focus: "Chest + triceps" },
  ];

  it("moves exercises completed in the previous 72 hours behind fresh choices", () => {
    const now = new Date("2026-08-29T08:00:00.000Z");
    const history = [
      { completedAt: "2026-08-28T08:00:00.000Z", exercises: [{ name: "Chest press", completedSets: [{}] }] },
      { completedAt: "2026-08-25T07:59:59.000Z", exercises: [{ name: "Cable fly", completedSets: [{}] }] },
    ];
    expect(personaliseExercises(exercises, history, "", now).map((item) => item.name)).toEqual(["Cable fly", "Push-up", "Chest press"]);
  });

  it("ignores recent workout exercises with no completed sets", () => {
    const history = [{ completedAt: "2026-08-29T07:00:00.000Z", exercises: [{ name: "Chest press", completedSets: [] }] }];
    expect(personaliseExercises(exercises, history, "", new Date("2026-08-29T08:00:00.000Z"))[0].name).toBe("Chest press");
  });

  it("removes movements that conflict with reported limitations", () => {
    expect(personaliseExercises(exercises, [], "sore shoulder").map((item) => item.name)).toEqual(["Chest press", "Cable fly", "Push-up"]);
    expect(conflictsWithLimitation({ name: "Push-up", focus: "Chest + triceps" }, "sore shoulder")).toBe(true);
    expect(conflictsWithLimitation({ name: "Bodyweight squat", focus: "Legs" }, "knee pain")).toBe(true);
  });

  it("reduces duration and set volume when readiness is low", () => {
    expect(durationForReadiness(60, "Low")).toBe(30);
    expect(durationForReadiness(30, "Low")).toBe(20);
    expect(setsForReadiness(3, "Low")).toBe(2);
    expect(setsForReadiness(2, "Low")).toBe(1);
    expect(durationForReadiness(45, "Ready")).toBe(45);
  });

  it("detects completed work before allowing a workout switch", () => {
    expect(completedSetCount([[], [{ reps: 10 }], [{ minutes: 5 }]])).toBe(2);
    expect(completedSetCount([[], []])).toBe(0);
  });

  it("preserves completed sets when saving a partial workout", () => {
    const exercises = [{ name: "Squat" }, { name: "Row" }];
    const logs = [[{ reps: 8, weightKg: 40 }], []];
    expect(protectCompletedSets(exercises, logs)).toEqual([
      { name: "Squat", completedSets: [{ reps: 8, weightKg: 40 }] },
      { name: "Row", completedSets: [] },
    ]);
  });
});
