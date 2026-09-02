export const APPROVED_EXERCISE_IMAGE_IDS = [
  "chest-bench",
  "chest-machine",
  "chest-decline-push-up",
  "chest-cable-fly",
  "chest-pec-deck",
  "back-prone-y",
  "back-db-row",
  "back-db-pullover",
  "back-renegade",
  "back-machine-row",
] as const;

export type ApprovedExerciseImageId = typeof APPROVED_EXERCISE_IMAGE_IDS[number];
