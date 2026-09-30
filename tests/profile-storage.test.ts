import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE_PREFERENCES } from "../shared/personal-details";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), get: vi.fn(), save: vi.fn(), migrate: vi.fn(), local: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.local, setItem: vi.fn() } }));
vi.mock("../lib/trpc", () => ({ createTRPCClient: () => ({ auth: { me: { query: mocks.owner } }, profile: { personalDetails: { query: mocks.get }, savePersonalDetails: { mutate: mocks.save }, importPersonalDetails: { mutate: mocks.migrate } } }) }));
import { loadProfilePreferences, saveProfilePreferences } from "../lib/profile-preferences";
beforeEach(() => { vi.clearAllMocks(); mocks.owner.mockResolvedValue({ id: 1, openId: "sam" }); mocks.local.mockResolvedValue(null); mocks.get.mockResolvedValue({ migrated: true, details: { ...DEFAULT_PROFILE_PREFERENCES, name: "Sam" } }); });
describe("profile persistence client", () => {
  it("loads authenticated information and never reads shared guest health data", async () => {
    expect((await loadProfilePreferences("sam")).name).toBe("Sam");
    expect(mocks.local).toHaveBeenCalledWith("pulsecoach.profile.sam");
    mocks.local.mockClear();
    await loadProfilePreferences("local-user");
    expect(mocks.local).not.toHaveBeenCalled();
  });
  it("rejects mismatched ownership for both reads and writes", async () => {
    await expect(loadProfilePreferences("someone-else")).rejects.toThrow("Sign in");
    await expect(saveProfilePreferences("someone-else", DEFAULT_PROFILE_PREFERENCES)).rejects.toThrow("Sign in");
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("imports owned legacy data once without overwriting an existing server profile", async () => {
    const legacy = { ...DEFAULT_PROFILE_PREFERENCES, name: "Legacy Sam", weightKg: 83 };
    mocks.local.mockImplementation(async (key: string) => key === "pulsecoach.profile.sam" ? JSON.stringify(legacy) : null);
    await loadProfilePreferences("sam"); expect(mocks.migrate).not.toHaveBeenCalled();
    mocks.get.mockResolvedValue({ migrated: false, details: DEFAULT_PROFILE_PREFERENCES });
    mocks.migrate.mockResolvedValue(legacy);
    expect(await loadProfilePreferences("sam")).toEqual(legacy);
    expect(mocks.migrate).toHaveBeenCalledWith(legacy);
  });
});
