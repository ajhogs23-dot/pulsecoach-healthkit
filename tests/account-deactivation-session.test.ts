import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ generation: "", getUser: vi.fn(), upsert: vi.fn() }));
vi.mock("../server/db", () => ({ getUserByOpenId: mock.getUser, upsertUser: mock.upsert }));
vi.mock("../server/account-deactivation", () => ({ getAccountGeneration: async () => mock.generation }));
vi.mock("../server/session-version", () => ({ sessionVersion: async () => 0 }));
vi.mock("../server/_core/env", () => ({ ENV: { appId: "test-app", cookieSecret: "test-secret", oAuthServerUrl: "https://example.com" } }));
import { sdk } from "../server/_core/sdk";
beforeEach(() => {
  vi.clearAllMocks(); mock.generation = "";
  mock.getUser.mockResolvedValue({ id: 7, openId: "github:test", name: "Test", role: "user", lastSignedIn: new Date() });
});
describe("deactivation sessions", () => {
  it("rejects the old cookie and bearer token after clearing, while a fresh login works", async () => {
    const old = await sdk.createSessionToken("github:test", { name: "Test" });
    expect((await sdk.authenticateRequest({ headers: { authorization: `Bearer ${old}` } } as any)).id).toBe(7);
    mock.generation = "new-reset";
    await expect(sdk.authenticateRequest({ headers: { authorization: `Bearer ${old}` } } as any)).rejects.toThrow("deactivated");
    await expect(sdk.authenticateRequest({ headers: { cookie: `app_session_id=${old}` } } as any)).rejects.toThrow("deactivated");
    const fresh = await sdk.createSessionToken("github:test", { name: "Test" });
    expect((await sdk.authenticateRequest({ headers: { authorization: `Bearer ${fresh}` } } as any)).accountGeneration).toBe("new-reset");
  });
});
