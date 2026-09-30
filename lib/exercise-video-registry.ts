import type { ImageSourcePropType } from "react-native";
import { APPROVED_EXERCISE_IMAGE_IDS, type ApprovedExerciseImageId } from "./approved-exercise-image-ids";
import { EXERCISE_IMAGE_ASSETS } from "./exercise-image-assets";

export type ExerciseVideoSource = "wger" | "none";
export type ExerciseVideoRecord = {
  videoUrl?: string;
  poster: ImageSourcePropType;
  source: ExerciseVideoSource;
  licence?: string;
  attribution?: string;
  duration?: number;
};

const unavailableAttribution = "No licensed video URL is currently registered for this exercise.";

export const EXERCISE_VIDEO_REGISTRY: Record<ApprovedExerciseImageId, ExerciseVideoRecord> = Object.fromEntries(
  APPROVED_EXERCISE_IMAGE_IDS.map((id) => [id, {
    videoUrl: undefined,
    poster: EXERCISE_IMAGE_ASSETS[id]!,
    source: "none",
    licence: "Not applicable",
    attribution: unavailableAttribution,
    duration: undefined,
  } satisfies ExerciseVideoRecord]),
) as Record<ApprovedExerciseImageId, ExerciseVideoRecord>;

export function isCacheableVideoUrl(videoUrl?: string): videoUrl is string {
  if (!videoUrl) return false;
  try {
    const parsed = new URL(videoUrl);
    return parsed.protocol === "https:" && /\.mp4$/i.test(parsed.pathname);
  } catch { return false; }
}

export function isValidVideoUrl(videoUrl?: string): videoUrl is string {
  if (!videoUrl) return false;
  try {
    const parsed = new URL(videoUrl);
    return parsed.protocol === "https:" && /\.(mp4|m3u8)$/i.test(parsed.pathname);
  } catch { return false; }
}

export function videoRecordFor(exerciseId: string) {
  return EXERCISE_VIDEO_REGISTRY[exerciseId as ApprovedExerciseImageId];
}
