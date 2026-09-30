import { describe, expect, it, vi } from "vitest";
import { EXERCISE_LIBRARY } from "../lib/exercise-library";
import { APPROVED_EXERCISE_IMAGE_IDS } from "../lib/approved-exercise-image-ids";
vi.mock("../lib/exercise-image-assets", () => ({
  EXERCISE_IMAGE_ASSETS: new Proxy({}, { get: (_target, property) => ({ uri: String(property) }) }),
}));
import { EXERCISE_VIDEO_REGISTRY, isCacheableVideoUrl, isValidVideoUrl } from "../lib/exercise-video-registry";

describe("exercise video registry", () => {
  it("has one poster record for every catalogue exercise", () => {
    expect(Object.keys(EXERCISE_VIDEO_REGISTRY)).toHaveLength(112);
    expect(Object.keys(EXERCISE_VIDEO_REGISTRY).sort()).toEqual([...APPROVED_EXERCISE_IMAGE_IDS].sort());
    for (const exercise of EXERCISE_LIBRARY) expect(EXERCISE_VIDEO_REGISTRY[exercise.id as keyof typeof EXERCISE_VIDEO_REGISTRY]).toBeDefined();
    for (const record of Object.values(EXERCISE_VIDEO_REGISTRY)) expect(record.poster).toBeDefined();
  });

  it("keeps the poster when a licensed video is missing", () => {
    const record = EXERCISE_VIDEO_REGISTRY["cardio-treadmill-walk"];
    expect(record.videoUrl).toBeUndefined();
    expect(record.poster).toBeDefined();
    expect(record.source).toBe("none");
  });

  it("rejects invalid URLs and caches only HTTPS MP4 sources", () => {
    expect(isValidVideoUrl("https://cdn.example.test/demo.mp4")).toBe(true);
    expect(isValidVideoUrl("https://cdn.example.test/demo.m3u8")).toBe(true);
    expect(isValidVideoUrl("http://cdn.example.test/demo.mp4")).toBe(false);
    expect(isValidVideoUrl("https://cdn.example.test/demo.webm")).toBe(false);
    expect(isValidVideoUrl("not-a-url")).toBe(false);
    expect(isCacheableVideoUrl("https://cdn.example.test/demo.mp4")).toBe(true);
    expect(isCacheableVideoUrl("https://cdn.example.test/demo.m3u8")).toBe(false);
  });
});
