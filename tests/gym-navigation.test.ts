import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Gym navigation route contract", () => {
  it("keeps the real Gym route and visible directory control wired", () => {
    expect(existsSync(resolve(process.cwd(), "app/gym.tsx"))).toBe(true);
    const source = readFileSync(resolve(process.cwd(), "app/gym.tsx"), "utf8");
    expect(source).toContain('router.push("/gym-directory"');
    const workout = readFileSync(resolve(process.cwd(), "app/(tabs)/workout.tsx"), "utf8");
    expect(workout).toContain('router.push("/gym"');
  });
  it("exposes a persistent machine-identification close control", () => {
    const source = readFileSync(resolve(process.cwd(), "app/machine.tsx"), "utf8");
    expect(source).toContain('accessibilityLabel="Close machine identification"');
    expect(source).toContain("router.canGoBack()");
    expect(source).toContain('router.replace("/gym"');
    expect(source).toContain("Preparing camera");
    expect(source).toContain("Camera access is optional");
    expect(source).toContain("onMountError");
    expect(source).toContain("Camera could not start");
  });
  it("does not reissue the cold-start reset after it has been consumed", async () => {
    const { shouldIssueHomeRedirect } = await import("../lib/navigation-startup");
    const base = { startupMode: "home" as const, isAuthenticated: true, isAuthRoute: false, atHome: false };
    expect(shouldIssueHomeRedirect({ ...base, alreadyIssued: false })).toBe(true);
    expect(shouldIssueHomeRedirect({ ...base, alreadyIssued: true })).toBe(false);
  });
});
