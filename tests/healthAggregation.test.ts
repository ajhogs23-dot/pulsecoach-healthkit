import { describe, expect, it } from "vitest";
import { healthStorageKey } from "../lib/healthkit";
describe("HealthKit user isolation", () => { it("uses a separate cache key per signed-in user", () => { expect(healthStorageKey("user-a")).toBe("pulsecoach.healthkit.user-a"); expect(healthStorageKey("user-b")).toBe("pulsecoach.healthkit.user-b"); expect(healthStorageKey("user-a")).not.toBe(healthStorageKey("user-b")); }); });
