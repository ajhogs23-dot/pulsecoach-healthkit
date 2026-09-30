import { describe, expect, it } from "vitest";
import { isIntentionalDeepLink, shouldIssueHomeRedirect, shouldResetColdLaunch } from "../lib/navigation-startup";

describe("navigation startup", () => {
  it("resets a cold launch without an explicit destination", () => {
    expect(shouldResetColdLaunch(null)).toBe(true);
    expect(shouldResetColdLaunch("pulsecoach:///(tabs)")).toBe(true);
  });
  it("retains explicit deep-link destinations", () => {
    expect(isIntentionalDeepLink("pulsecoach:///equipment/abc")).toBe(true);
    expect(shouldResetColdLaunch("https://pulsecoach.example/exercise/bench-press")).toBe(false);
  });
  it("does not apply cold-launch logic to a background resume", () => {
    expect(shouldResetColdLaunch(undefined)).toBe(true);
    expect(isIntentionalDeepLink(undefined)).toBe(false);
  });
  it("issues the Home redirect only once, then permits Gym and tab navigation", () => {
    const cold = { startupMode: "home" as const, isAuthenticated: true, isAuthRoute: false, atHome: false, alreadyIssued: false };
    expect(shouldIssueHomeRedirect(cold)).toBe(true);
    expect(shouldIssueHomeRedirect({ ...cold, alreadyIssued: true })).toBe(false);
    expect(shouldIssueHomeRedirect({ ...cold, atHome: true })).toBe(false);
  });
  it("does not reset an active screen after a background resume", () => {
    expect(shouldIssueHomeRedirect({ startupMode: "deep-link", isAuthenticated: true, isAuthRoute: false, atHome: false, alreadyIssued: false })).toBe(false);
  });
});
