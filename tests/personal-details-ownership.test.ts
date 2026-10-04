import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE_PREFERENCES } from "../shared/personal-details";
import type { TrpcContext } from "../server/_core/context";
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), llm: vi.fn() }));
vi.mock("../server/db", () => ({ getPersonalDetails: mocks.get, savePersonalDetails: mocks.save }));
vi.mock("../server/_core/llm", () => ({ invokeLLM: mocks.llm }));
vi.mock("../server/account-deactivation",()=>({guardAccountMutation:async(_id:number,_generation:string,action:()=>Promise<unknown>)=>action()}));
import { appRouter } from "../server/routers";
const detail = { ...DEFAULT_PROFILE_PREFERENCES, name: "Private Sam", allergies: "Peanuts", calorieTarget: 2300 };
function caller(id: number | null) {
  return appRouter.createCaller({ user: id ? { id, openId: `user-${id}`, name: `User ${id}`, role: "user" } : null, req: {}, res: {} } as TrpcContext);
}
beforeEach(() => {
  vi.clearAllMocks();
  const records = new Map<number, typeof detail>();
  mocks.get.mockImplementation(async (id: number) => ({ details: records.get(id) ?? { ...DEFAULT_PROFILE_PREFERENCES, name: `User ${id}` }, migrated: records.has(id) }));
  mocks.save.mockImplementation(async (id: number, _name: string, value: typeof detail) => { records.set(id, JSON.parse(JSON.stringify(value))); return records.get(id); });
  mocks.llm.mockResolvedValue({ choices: [{ message: { content: "Guidance" } }] });
});
describe("authenticated personal details API", () => {
  it("rejects unauthenticated reads, saves, imports and coaching", async () => {
    await expect(caller(null).profile.personalDetails()).rejects.toThrow();
    await expect(caller(null).profile.savePersonalDetails(detail)).rejects.toThrow();
    await expect(caller(null).profile.importPersonalDetails(detail)).rejects.toThrow();
    await expect(caller(null).coach.ask({ message: "Help" })).rejects.toThrow();
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("saves and reloads only the session owner's record", async () => {
    await caller(1).profile.savePersonalDetails(detail);
    expect((await caller(1).profile.personalDetails()).details).toMatchObject(detail);
    expect((await caller(2).profile.personalDetails()).details.name).toBe("User 2");
    expect(mocks.save).toHaveBeenCalledWith(1, "User 1", detail);
  });
  it("rejects spoofed ownership and unrealistic measurements on the server", async () => {
    await expect(caller(1).profile.savePersonalDetails({ ...detail, userId: 2 } as typeof detail)).rejects.toThrow();
    await expect(caller(1).profile.savePersonalDetails({ ...detail, heightCm: 4 })).rejects.toThrow();
    await expect(caller(1).profile.savePersonalDetails({ ...detail, calorieTargetMode: "estimated" })).rejects.toThrow();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("coaching reads the latest profile for the authenticated owner", async () => {
    await caller(1).profile.savePersonalDetails(detail);
    await caller(1).coach.ask({ message: "Suggest a meal" });
    const request = JSON.stringify(mocks.llm.mock.calls[0]);
    expect(request).toContain("Peanuts"); expect(request).toContain("2300");
    await caller(2).coach.ask({ message: "Suggest a meal" });
    expect(JSON.stringify(mocks.llm.mock.calls[1])).not.toContain("Peanuts");
  });
});
