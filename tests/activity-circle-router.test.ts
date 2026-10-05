import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ circle: vi.fn(), request: vi.fn(), respond: vi.fn(), removeFriend: vi.fn(), publish: vi.fn(), feed: vi.fn(), unpublish: vi.fn(), cheer: vi.fn(), guard: vi.fn() }));
vi.mock("../server/activity-circle", () => ({ activityCircle: mock }));
vi.mock("../server/account-deactivation", () => ({ guardAccountMutation: mock.guard }));
import { activityCircleRouter } from "../server/activity-circle-router";
import { router } from "../server/_core/trpc";
import type { TrpcContext } from "../server/_core/context";
const root = router({ activityCircle: activityCircleRouter });
const caller = (id?: number) => root.createCaller({ user: id ? { id, accountGeneration: "generation" } : null } as TrpcContext).activityCircle;
const draft = { localId: "walk:1", activity: "Walk" as const, title: "Morning walk", completedAt: "2026-10-05T03:00:00.000Z", seconds: 900, distanceMetres: 1000, elevationGain: 0 };
beforeEach(() => { vi.clearAllMocks(); mock.guard.mockImplementation((_id, _generation, action) => action()); });
describe("authenticated friends API", () => {
  it("rejects unsigned reads and writes", async () => { await expect(caller().feed({})).rejects.toThrow(); await expect(caller().publish(draft)).rejects.toThrow(); expect(mock.feed).not.toHaveBeenCalled(); expect(mock.publish).not.toHaveBeenCalled(); });
  it("uses the authenticated owner, defaults to no route, and guards the current account generation", async () => { await caller(7).publish(draft); expect(mock.publish).toHaveBeenCalledWith(7, { ...draft, caption: "", route: [] }); expect(mock.guard).toHaveBeenCalledWith(7, "generation", expect.any(Function)); });
  it("rejects caller-supplied ownership and unsafe coordinates before storage", async () => { await expect(caller(7).publish({ ...draft, ownerId: 99 } as any)).rejects.toThrow(); await expect(caller(7).publish({ ...draft, route: [{ latitude: 120, longitude: 0 }] })).rejects.toThrow(); expect(mock.publish).not.toHaveBeenCalled(); });
  it("preserves owner scoping for removals and friend decisions", async () => { await caller(7).unpublish({ id: 12 }); await caller(7).respond({ friendId: 9, accept: true }); expect(mock.unpublish).toHaveBeenCalledWith(7, 12); expect(mock.respond).toHaveBeenCalledWith(7, 9, true); });
  it("normalises invite codes and does not expose a general athlete search", async () => { await caller(7).request({ code: "vt-123456abcdef" }); expect(mock.request).toHaveBeenCalledWith(7, "VT-123456ABCDEF"); await expect(caller(7).request({ code: "person@example.com" })).rejects.toThrow(); });
  it("guards creation of a friend code and scopes paginated feed reads", async () => { await caller(7).circle(); await caller(7).feed({ beforeId: 100 }); expect(mock.circle).toHaveBeenCalledWith(7); expect(mock.feed).toHaveBeenCalledWith(7, 100); expect(mock.guard).toHaveBeenCalledWith(7, "generation", expect.any(Function)); });
});
