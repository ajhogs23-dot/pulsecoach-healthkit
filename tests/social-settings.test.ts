import { describe, expect, it } from "vitest";
import { DEFAULT_USER_SETTINGS, normalizeSocialAudiences, userSettingsSchema } from "../shared/settings-preferences";
import { DEFAULT_PROFILE_PREFERENCES, personalDetailsSchema } from "../shared/personal-details";

const withSocial = (social: Record<string, unknown>) => ({ ...DEFAULT_USER_SETTINGS, socialCommunity: { ...DEFAULT_USER_SETTINGS.socialCommunity, ...social } });
describe("social audience settings", () => {
  it("accepts several audiences through the actual profile save contract", () => {
    const settings = withSocial({ groupVisibility: ["friends", "local", "state"], leaderboardPrivacy: ["friends", "national"] });
    const saved = personalDetailsSchema.parse({ ...DEFAULT_PROFILE_PREFERENCES, name: "Andrew", settings });
    const savedSettings = userSettingsSchema.parse(saved.settings);
    expect(savedSettings.socialCommunity.groupVisibility).toEqual(["friends", "local", "state"]);
    expect(savedSettings.socialCommunity.leaderboardPrivacy).toEqual(["friends", "national"]);
  });
  it("retains older single choices and migrates boolean privacy safely", () => {
    for (const [privacy, expected] of [[true, ["private"]], [false, ["friends"]], ["local", ["local"]]] as const) {
      const legacy = withSocial({ groupVisibility: "national", leaderboardPrivacy: privacy });
      const parsed = userSettingsSchema.parse(legacy);
      expect(parsed.socialCommunity.groupVisibility).toEqual(["national"]);
      expect(parsed.socialCommunity.leaderboardPrivacy).toEqual(expected);
      expect(normalizeSocialAudiences(legacy as any).socialCommunity).toEqual(parsed.socialCommunity);
    }
  });
  it("keeps private exclusive and empty leaderboard selection private", () => {
    for (const leaderboardPrivacy of [[], ["private", "global"]]) {
      expect(userSettingsSchema.parse(withSocial({ leaderboardPrivacy })).socialCommunity.leaderboardPrivacy).toEqual(["private"]);
    }
    expect(userSettingsSchema.parse(withSocial({ groupVisibility: [] })).socialCommunity.groupVisibility).toEqual([]);
  });
  it("rejects unknown audiences and deduplicates supported choices", () => {
    expect(userSettingsSchema.safeParse(withSocial({ groupVisibility: ["everyone"] })).success).toBe(false);
    expect(userSettingsSchema.safeParse(withSocial({ leaderboardPrivacy: ["everyone"] })).success).toBe(false);
    expect(userSettingsSchema.parse(withSocial({ groupVisibility: ["local", "local"] })).socialCommunity.groupVisibility).toEqual(["local"]);
  });
});
