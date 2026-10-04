import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ deactivate: vi.fn(), cookie: vi.fn() }));
vi.mock("../server/account-deactivation", () => ({ deactivateAccount: mock.deactivate, guardAccountMutation: async (_id: number, _generation: string, action: () => Promise<unknown>) => action() }));
import { appRouter } from "../server/routers";
const caller = (user: any = { id: 7, openId: "github:test", name: "Test", role: "user", accountGeneration: "generation" }) => appRouter.createCaller({ user, req: { headers: {}, protocol: "http" }, res: { clearCookie: mock.cookie } } as any);
beforeEach(() => { vi.clearAllMocks(); mock.deactivate.mockResolvedValue({ success: true, generation: "new" }); });
describe("deactivation API", () => {
  it("requires an authenticated account and explicit confirmation", async () => {
    await expect(caller(null).auth.deactivate({ confirmation: "CLEAR_MY_PROFILE" })).rejects.toThrow();
    await expect(caller().auth.deactivate({ confirmation: "yes" } as any)).rejects.toThrow();
    await expect(caller().auth.deactivate({ confirmation: "CLEAR_MY_PROFILE", userId: 8 } as any)).rejects.toThrow();
    expect(mock.deactivate).not.toHaveBeenCalled();
  });
  it("uses the session owner and clears the real session cookie after success", async () => {
    await caller().auth.deactivate({ confirmation: "CLEAR_MY_PROFILE" });
    expect(mock.deactivate).toHaveBeenCalledWith(7, "generation");
    expect(mock.cookie).toHaveBeenCalledWith("app_session_id", expect.objectContaining({ path: "/", httpOnly: true }));
  });
  it("does not clear the sign-in cookie if server cleanup fails", async () => {
    mock.deactivate.mockRejectedValue(new Error("rollback"));
    await expect(caller().auth.deactivate({ confirmation: "CLEAR_MY_PROFILE" })).rejects.toThrow("rollback");
    expect(mock.cookie).not.toHaveBeenCalled();
  });
});
