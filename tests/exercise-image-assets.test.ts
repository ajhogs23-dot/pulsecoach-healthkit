import { describe, expect, it } from "vitest";
import { EXERCISE_LIBRARY } from "../lib/exercise-library";
import { APPROVED_EXERCISE_IMAGE_IDS } from "../lib/approved-exercise-image-ids";

describe("approved exercise images", () => {
  it("maps every approved asset to an exercise in the library", () => {
    const exerciseIds = new Set(EXERCISE_LIBRARY.map((exercise) => exercise.id));
    expect(APPROVED_EXERCISE_IMAGE_IDS).toHaveLength(10);
    for (const id of APPROVED_EXERCISE_IMAGE_IDS) expect(exerciseIds.has(id), id).toBe(true);
  });

  it("adds only the nine approved reference-pack exercises to the existing bench press", () => {
    expect(APPROVED_EXERCISE_IMAGE_IDS.slice(1)).toEqual([
      "chest-machine",
      "chest-decline-push-up",
      "chest-cable-fly",
      "chest-pec-deck",
      "back-prone-y",
      "back-db-row",
      "back-db-pullover",
      "back-renegade",
      "back-machine-row",
    ]);
  });
});
