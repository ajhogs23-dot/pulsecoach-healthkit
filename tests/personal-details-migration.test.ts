import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE_PREFERENCES } from "../shared/personal-details";
const state = vi.hoisted(() => ({ profile: undefined as Record<string, unknown> | undefined, goal: undefined as Record<string, unknown> | undefined }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => ({
  select: () => ({ from: (table: Record<symbol, string>) => {
    const query = { where: () => query, orderBy: () => query, limit: async () => {
      const row = table[Symbol.for("drizzle:Name")] === "profiles" ? state.profile : state.goal;
      return row ? [row] : [];
    } }; return query;
  } }),
  insert: () => ({ values: (value: Record<string, unknown>) => ({ onDuplicateKeyUpdate: async ({ set }: { set: Record<string, unknown> }) => {
    if (!state.profile) state.profile = { ...value };
    else {
      const json = set.personalDetailsJson;
      state.profile = { ...state.profile, ...(typeof json === "string" ? set : { personalDetailsJson: state.profile.personalDetailsJson ?? value.personalDetailsJson }) };
    }
  } }) }),
}) }));
import { getPersonalDetails, savePersonalDetails } from "../server/db";
beforeEach(() => { process.env.DATABASE_URL = "mysql://test-only"; state.profile = undefined; state.goal = undefined; });
describe("personal details repository migration", () => {
  it("seeds account name, existing units and goals without writes", async () => {
    state.profile = { userId: 1, username: "original", unitSystem: "imperial" };
    state.goal = { currentWeight: "84", goalWeight: "78", primaryGoal: "Lose fat", pace: "steady" };
    const result = await getPersonalDetails(1, "Account Sam");
    expect(result.details).toMatchObject({ name: "Account Sam", unitSystem: "imperial", weightKg: 84, targetWeightKg: 78, goal: "Lose fat", progressRate: 0.5 });
    expect(state.profile.personalDetailsJson).toBeUndefined();
  });
  it("imports nonconflicting legacy fields and keeps existing account data", async () => {
    state.profile = { userId: 1, username: "original", unitSystem: "imperial" };
    state.goal = { currentWeight: "84", primaryGoal: "Lose fat" };
    const result = await savePersonalDetails(1, "Account Sam", { ...DEFAULT_PROFILE_PREFERENCES, name: "Old name", weightKg: 70, heightCm: 178, allergies: "Sesame" }, true);
    expect(result).toMatchObject({ name: "Account Sam", weightKg: 84, heightCm: 178, allergies: "Sesame", unitSystem: "imperial" });
    expect(state.profile.username).toBe("original");
    await savePersonalDetails(1, "Account Sam", { ...DEFAULT_PROFILE_PREFERENCES, name: "Overwrite attempt" }, true);
    expect((await getPersonalDetails(1, "Account Sam")).details).toEqual(result);
  });
  it("saves, reopens, clears optional fields and preserves unknown legacy information", async () => {
    state.profile = { userId: 1, username: "original", unitSystem: "metric", personalDetailsJson: JSON.stringify({ ...DEFAULT_PROFILE_PREFERENCES, name: "Sam", weightKg: 80, futurePreference: "keep me" }) };
    state.goal = { currentWeight: "90" };
    const existing = (await getPersonalDetails(1, "Account Sam")).details;
    await savePersonalDetails(1, "Account Sam", { ...existing, name: "Updated", weightKg: undefined, calorieTarget: 2400, calorieTargetMode: "estimated" });
    const reopened = (await getPersonalDetails(1, "Account Sam")).details;
    expect(reopened.name).toBe("Updated"); expect(reopened.weightKg).toBeUndefined();
    expect(reopened.calorieTarget).toBe(2400);
    expect(JSON.parse(String(state.profile.personalDetailsJson)).futurePreference).toBe("keep me");
  });
});
