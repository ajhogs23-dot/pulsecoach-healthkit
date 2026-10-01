import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import { registerGitHubOAuthRoutes, pkceChallenge, allowedReturnUrl } from "../server/_core/github-oauth";
import { getSessionCookieOptions } from "../server/_core/cookies";

vi.mock("../server/db", () => ({ upsertUser: vi.fn(), getUserByOpenId: vi.fn(async () => ({
  id: 1, name: "Test User", email: null, lastSignedIn: new Date(0),
})) }));
vi.mock("../server/_core/sdk", () => ({ sdk: { createSessionToken: vi.fn(async () => "test-session") } }));

const routes = new Map<string, Function>();
const app = { get: (path: string, handler: Function) => routes.set(`GET ${path}`, handler),
  post: (path: string, handler: Function) => routes.set(`POST ${path}`, handler) } as unknown as Express;
function response() {
  return { code: 200, data: null as any, url: "", cookies: [] as any[],
    setHeader: vi.fn(), clearCookie: vi.fn(),
    status(code: number) { this.code = code; return this; },
    json(data: unknown) { this.data = data; return this; },
    cookie(...args: any[]) { this.cookies.push(args); return this; },
    redirect(_status: number, url: string) { this.url = url; return this; } };
}
async function call(method: string, path: string, request: any = {}) {
  const res = response();
  await routes.get(`${method} ${path}`)!({ headers: {}, protocol: "https", hostname: "example.up.railway.app", query: {}, ...request }, res);
  return res;
}
const verifier = "a".repeat(64);
const returnUrl = "manuspulsecoach://oauth/callback";
async function start() {
  const prepare = await call("POST", "/api/oauth/prepare", { body: { challenge: pkceChallenge(verifier), returnUrl } });
  const state = new URL(prepare.data.url).searchParams.get("state")!;
  const begin = await call("GET", "/api/oauth/start", { query: { state } });
  const cookie = `${begin.cookies[0][0]}=${begin.cookies[0][1]}`;
  return { state, begin, cookie };
}
beforeEach(() => {
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client"); vi.stubEnv("GITHUB_CLIENT_SECRET", "test-secret");
  vi.stubEnv("JWT_SECRET", "test-only-secret-with-at-least-32-characters");
  vi.stubEnv("PUBLIC_API_URL", "https://example.up.railway.app");
  vi.stubEnv("OAUTH_RETURN_URLS", returnUrl);
  registerGitHubOAuthRoutes(app);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("GitHub sign-in", () => {
  it("rejects arbitrary redirects and malformed challenges", async () => {
    expect(() => allowedReturnUrl("https://evil.example/oauth/callback")).toThrow();
    const res = await call("POST", "/api/oauth/prepare", { body: { challenge: "bad", returnUrl } });
    expect(res.code).toBe(400);
  });
  it("requires configured server credentials", async () => {
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");
    const res = await call("POST", "/api/oauth/prepare", { body: { challenge: pkceChallenge(verifier), returnUrl } });
    expect(res.code).toBe(503);
  });
  it("uses PKCE and a host-only httpOnly browser cookie", async () => {
    const { begin } = await start();
    const url = new URL(begin.url);
    expect(url.origin).toBe("https://github.com");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
    expect(begin.cookies[0][2]).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
    expect(begin.cookies[0][2].domain).toBeUndefined();
  });
  it("rejects callback state mismatch before contacting GitHub", async () => {
    const { cookie } = await start();
    const remote = vi.fn(); vi.stubGlobal("fetch", remote);
    const res = await call("GET", "/api/oauth/callback", { query: { code: "code", state: "wrong" }, headers: { cookie } });
    expect(res.code).toBe(400); expect(remote).not.toHaveBeenCalled();
  });
  it("handles user cancellation without creating a session", async () => {
    const { state, cookie } = await start();
    const remote = vi.fn(); vi.stubGlobal("fetch", remote);
    const res = await call("GET", "/api/oauth/callback", { query: { error: "access_denied", state }, headers: { cookie } });
    expect(new URL(res.url).searchParams.get("error")).toContain("cancelled");
    expect(remote).not.toHaveBeenCalled(); expect(res.cookies).toHaveLength(0);
  });
  it("exchanges a handoff only once and only on the initiating device", async () => {
    const { state, cookie } = await start();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "test-provider-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 42, login: "test-user", name: "Test User" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }));
    const callback = await call("GET", "/api/oauth/callback", { query: { code: "test-code", state }, headers: { cookie } });
    const loginCode = new URL(callback.url).searchParams.get("loginCode");
    expect(loginCode).toBeTruthy(); expect(callback.url).not.toContain("test-session");
    const bad = await call("POST", "/api/oauth/exchange", { body: { loginCode, verifier: "b".repeat(64) } });
    expect(bad.code).toBe(401);
    const good = await call("POST", "/api/oauth/exchange", { body: { loginCode, verifier } });
    expect(good.data.user.openId).toBe("github:42"); expect(good.data.app_session_id).toBe("test-session");
    const replay = await call("POST", "/api/oauth/exchange", { body: { loginCode, verifier } });
    expect(replay.code).toBe(401);
  });
  it("scopes Railway session cookies to the individual service", () => {
    expect(getSessionCookieOptions({ protocol: "https", hostname: "test.up.railway.app", headers: {} } as any).domain).toBeUndefined();
  });
});
