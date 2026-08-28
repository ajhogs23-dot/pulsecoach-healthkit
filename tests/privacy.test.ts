import { describe, expect, it } from "vitest";
import { competitionVisibility, defaultFriendShares, toggleShareCategory } from "../lib/privacy";

describe("friend sharing", () => {
  it("starts new friends fully private", () => {
    expect(defaultFriendShares()).toEqual([]);
  });
  it("toggles one category without changing other permissions", () => {
    expect(toggleShareCategory(["Steps"], "BMI")).toEqual(["Steps", "BMI"]);
    expect(toggleShareCategory(["Steps", "BMI"], "BMI")).toEqual(["Steps"]);
  });
  it("only exposes the competition metric after consent", () => {
    expect(competitionVisibility("Steps", ["Steps"])).toBe("Competition metric visible");
    expect(competitionVisibility("Weight trend", ["Steps"])).toContain("hidden");
  });
});
