import { describe, expect, it } from "vitest";
import { durationForReadiness, orderExercisesForRecovery, setCountForReadiness } from "../lib/workout-personalisation";

describe("workout personalisation", () => {
  const exercises = [
    { name: "Chest press", focus: "Chest" },
    { name: "Cable fly", focus: "Chest" },
    { name: "Push-up", focus: "Chest" },
  ];

  it("moves recently completed exercises behind fresh alternatives", () => {
    const history = [{ completedAt: "2026-08-28T08:00:00.000Z", exercises: [{ name: "Chest press", completedSets: [{}] }] }];
    const ordered = orderExercisesForRecovery(exercises, history, "", new Date("2026-08-29T08:00:00.000Z"));
    expect(ordered[0].name).not.toBe("Chest press");
    expect(ordered[ordered.length - 1].name).toBe("Chest press");
  });

  it("filters movements that conflict with entered pain", () => {
    expect(orderExercisesForRecovery(exercises, [], "sore shoulder").map((item) => item.name)).toEqual(["Push-up"]);
  });

  it("reduces volume when readiness is low", () => {
    expect(setCountForReadiness("Build strength", "Low")).toBe(2);
    expect(durationForReadiness(60, "Low")).toBe(30);
  });
});
