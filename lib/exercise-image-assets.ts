import type { ImageSourcePropType } from "react-native";
import type { ApprovedExerciseImageId } from "@/lib/approved-exercise-image-ids";

/** Locally approved exercise demonstrations. Add entries only after visual review. */
const approvedAssets: Record<ApprovedExerciseImageId, ImageSourcePropType> = {
  "chest-bench": require("@/assets/images/exercises/barbell-bench-press.png"),
  "chest-machine": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (2).png"),
  "chest-decline-push-up": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (3).png"),
  "chest-cable-fly": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (4).png"),
  "chest-pec-deck": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (5).png"),
  "back-prone-y": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (6).png"),
  "back-db-row": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (7).png"),
  "back-db-pullover": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (8).png"),
  "back-renegade": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (9).png"),
  "back-machine-row": require("@/assets/images/exercises/ChatGPT Image Sep 2, 2026, 09_42_18 PM (10).png"),
};

export const EXERCISE_IMAGE_ASSETS: Partial<Record<string, ImageSourcePropType>> = approvedAssets;
