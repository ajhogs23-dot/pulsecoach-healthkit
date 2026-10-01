import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express } from "express";
import { getSessionCookieOptions } from "./cookies";
import { registerGitHubOAuthRoutes } from "./github-oauth";
import { sdk } from "./sdk";

export function registerOAuthRoutes(app: Express) {
  registerGitHubOAuthRoutes(app);
  app.get("/api/oauth/mobile", (_req, res) => {
    res.status(410).json({ error: "Update VELTURA to use GitHub sign-in" });
  });
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: { id: user.id, openId: user.openId, name: user.name, email: user.email,
        loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn.toISOString() } });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) { res.status(400).json({ error: "Bearer token required" }); return; }
      res.cookie(COOKIE_NAME, auth.slice(7).trim(), { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, openId: user.openId, name: user.name,
        email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn.toISOString() } });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
