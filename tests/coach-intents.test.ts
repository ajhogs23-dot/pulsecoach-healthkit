import { describe, expect, it } from "vitest";
import { appDestinationFromPrompt, workoutFocusFromPrompt } from "../lib/coach-intents";

describe("coach workout voice intents", () => {
  it("recognises a chest workout request", () => {
    expect(workoutFocusFromPrompt("I want to work out chest today")).toBe("Chest");
  });

  it("recognises common muscle aliases", () => {
    expect(workoutFocusFromPrompt("Train my biceps at the gym")).toBe("Arms");
    expect(workoutFocusFromPrompt("Plan a workout for my lats")).toBe("Back");
  });

  it("does not redirect general questions", () => {
    expect(workoutFocusFromPrompt("Why is my chest sore?")).toBeUndefined();
  });

  it("opens app features from natural voice commands", () => {
    expect(appDestinationFromPrompt("start a run for me")).toBe("run");
    expect(appDestinationFromPrompt("take me to pantry recipes")).toBe("recipes");
    expect(appDestinationFromPrompt("show my progress this week")).toBe("progress");
  });
});
