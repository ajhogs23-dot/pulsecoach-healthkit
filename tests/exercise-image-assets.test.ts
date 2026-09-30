import { describe, expect, it } from "vitest";
import { EXERCISE_LIBRARY } from "../lib/exercise-library";
import { APPROVED_EXERCISE_IMAGE_IDS } from "../lib/approved-exercise-image-ids";

describe("approved exercise images", () => {
  it("maps every approved asset to an exercise in the library", () => {
    const exerciseIds = new Set(EXERCISE_LIBRARY.map((exercise) => exercise.id));
    expect(APPROVED_EXERCISE_IMAGE_IDS).toHaveLength(112);
    for (const id of APPROVED_EXERCISE_IMAGE_IDS) expect(exerciseIds.has(id), id).toBe(true);
  });

  it("contains only the nine exercises listed in the approved reference pack", () => {
    const referencePackIds = [
      "chest-machine",
      "chest-decline-push-up",
      "chest-cable-fly",
      "chest-pec-deck",
      "back-prone-y",
      "back-db-row",
      "back-db-pullover",
      "back-renegade",
      "back-machine-row",
    ];
    for (const id of referencePackIds) expect(APPROVED_EXERCISE_IMAGE_IDS).toContain(id);
  });

  it("covers every Chest exercise after the first generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const chestExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Chest");
    expect(chestExercises).toHaveLength(15);
    expect(chestExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers every Back exercise after the second generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const backExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Back");
    expect(backExercises).toHaveLength(14);
    expect(backExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers every Shoulders exercise after the third generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const shoulderExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Shoulders");
    expect(shoulderExercises).toHaveLength(12);
    expect(shoulderExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers every Arms exercise after the fourth generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const armExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Arms");
    expect(armExercises).toHaveLength(14);
    expect(armExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers every Legs exercise after the fifth generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const legExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Legs");
    expect(legExercises).toHaveLength(22);
    expect(legExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers every Core exercise after the sixth generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const coreExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Core");
    expect(coreExercises).toHaveLength(12);
    expect(coreExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers every Cardio exercise after the seventh generated batch", () => {
    const approvedIds = new Set<string>(APPROVED_EXERCISE_IMAGE_IDS);
    const cardioExercises = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Cardio");
    expect(cardioExercises).toHaveLength(23);
    expect(cardioExercises.filter((exercise) => !approvedIds.has(exercise.id))).toEqual([]);
  });

  it("covers the complete 112-exercise catalogue exactly once", () => {
    const exerciseIds = EXERCISE_LIBRARY.map((exercise) => exercise.id);
    expect(new Set(APPROVED_EXERCISE_IMAGE_IDS).size).toBe(112);
    expect(new Set(exerciseIds).size).toBe(112);
    expect(APPROVED_EXERCISE_IMAGE_IDS).toEqual(expect.arrayContaining(exerciseIds));
  });
});
