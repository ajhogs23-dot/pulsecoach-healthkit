import { createHash, randomBytes } from "node:crypto";
import { parse } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Express } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const FLOW_COOKIE = "veltura_oauth_flow";
const TTL = 10 * 60 * 1000;
const handoffs = new Map<string, { challenge: string; token: string; user: unknown; expires: number }>();
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function allowedReturnUrl(value: string): string {
  const url = new URL(value);
  const allowed = (process.env.OAUTH_RETURN_URLS || "manuspulsecoach://oauth/callback")
    .split(",").map((entry) => entry.trim()).filter(Boolean);
  if (url.username || url.password || url.search || url.hash || !allowed.includes(value)) {
    throw new Error("Return URL is not configured");
  }
  return value;
}

function config() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const secret = process.env.JWT_SECRET;
  const base = process.env.PUBLIC_API_URL;
  if (!clientId || !clientSecret || !secret || secret.length < 32 || !base) {
    throw new Error("GitHub login is not configured");
  }
  const origin = new URL(base);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") throw new Error("Invalid API URL");
  return { clientId, clientSecret, key: new TextEncoder().encode(secret), callback: `${origin.origin}/api/oauth/callback` };
}

async function signFlow(payload: Record<string, unknown>) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" })
    .setIssuer("veltura-oauth").setAudience("github-login").setIssuedAt().setExpirationTime("10m").sign(config().key);
}

async function readFlow(token: string) {
  const { payload } = await jwtVerify(token, config().key, {
    algorithms: ["HS256"], issuer: "veltura-oauth", audience: "github-login",
  });
  if (typeof payload.returnUrl !== "string" || typeof payload.challenge !== "string" || typeof payload.nonce !== "string") {
    throw new Error("Invalid login state");
  }
  allowedReturnUrl(payload.returnUrl);
  return payload as typeof payload & { returnUrl: string; challenge: string; nonce: string };
}

export function registerGitHubOAuthRoutes(app: Express) {
  app.post("/api/oauth/prepare", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const { challenge, returnUrl } = req.body ?? {};
      if (typeof challenge !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || typeof returnUrl !== "string") {
        res.status(400).json({ error: "Invalid login request" }); return;
      }
      const state = await signFlow({ challenge, returnUrl: allowedReturnUrl(returnUrl), nonce: randomBytes(32).toString("base64url") });
      const start = new URL("/api/oauth/start", process.env.PUBLIC_API_URL);
      start.searchParams.set("state", state);
      res.json({ url: start.toString() });
    } catch {
      res.status(503).json({ error: "GitHub login is not configured for this app" });
    }
  });

  app.get("/api/oauth/start", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (typeof req.query.state !== "string") throw new Error("Missing state");
      const flow = await readFlow(req.query.state);
      const verifier = randomBytes(32).toString("base64url");
      const cookie = await signFlow({ ...flow, state: req.query.state, verifier });
      const options = getSessionCookieOptions(req);
      res.cookie(FLOW_COOKIE, cookie, { ...options, sameSite: "lax", path: "/api/oauth", maxAge: TTL });
      const { clientId, callback } = config();
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback,
        scope: "read:user user:email", state: req.query.state,
        code_challenge: pkceChallenge(verifier), code_challenge_method: "S256" }).toString();
      res.redirect(302, authorize.toString());
    } catch {
      res.status(400).json({ error: "Login request expired or is invalid. Start again." });
    }
  });

  app.get("/api/oauth/callback", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      const cookie = parse(req.headers.cookie || "")[FLOW_COOKIE];
      if (!cookie || typeof req.query.state !== "string") throw new Error("Missing flow");
      const flow = await readFlow(cookie);
      if (flow.state !== req.query.state || typeof flow.verifier !== "string") throw new Error("State mismatch");
      const options = getSessionCookieOptions(req);
      res.clearCookie(FLOW_COOKIE, { ...options, sameSite: "lax", path: "/api/oauth" });
      const destination = new URL(flow.returnUrl);
      if (req.query.error || typeof req.query.code !== "string") {
        destination.searchParams.set("error", "GitHub sign-in was cancelled. Please try again.");
        res.redirect(302, destination.toString()); return;
      }
      const { clientId, clientSecret, callback } = config();
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: req.query.code,
          redirect_uri: callback, code_verifier: flow.verifier }), signal: AbortSignal.timeout(15000),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || typeof tokenData.access_token !== "string") throw new Error("Token exchange failed");
      const headers = { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "VELTURA" };
      const profileResponse = await fetch("https://api.github.com/user", { headers, signal: AbortSignal.timeout(15000) });
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !Number.isSafeInteger(profile.id) || typeof profile.login !== "string") throw new Error("Invalid GitHub user");
      let email: string | null = null;
      const emailResponse = await fetch("https://api.github.com/user/emails", { headers, signal: AbortSignal.timeout(15000) });
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        if (Array.isArray(emails)) email = emails.find((entry) => entry.primary && entry.verified)?.email ?? null;
      }
      const openId = `github:${profile.id}`;
      await upsertUser({ openId, name: profile.name || profile.login, email, loginMethod: "github", lastSignedIn: new Date() });
      const saved = await getUserByOpenId(openId);
      if (!saved) throw new Error("Could not save user");
      const token = await sdk.createSessionToken(openId, { name: saved.name || profile.login, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, token, { ...options, maxAge: ONE_YEAR_MS });
      const now = Date.now();
      for (const [key, value] of handoffs) if (value.expires <= now) handoffs.delete(key);
      if (handoffs.size >= 1000) throw new Error("Too many pending logins");
      const code = randomBytes(32).toString("base64url");
      handoffs.set(code, { challenge: flow.challenge, token, user: { id: saved.id, openId, name: saved.name,
        email: saved.email, loginMethod: "github", lastSignedIn: saved.lastSignedIn.toISOString() }, expires: now + 60000 });
      destination.searchParams.set("loginCode", code);
      res.redirect(302, destination.toString());
    } catch {
      // Never log provider responses, authorization codes, or private credentials.
      res.status(400).json({ error: "GitHub sign-in could not be completed. Start again from VELTURA." });
    }
  });

  app.post("/api/oauth/exchange", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const { loginCode, verifier } = req.body ?? {};
    if (typeof loginCode !== "string" || typeof verifier !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) {
      res.status(400).json({ error: "Invalid login exchange" }); return;
    }
    const result = handoffs.get(loginCode);
    if (!result || result.expires <= Date.now() || pkceChallenge(verifier) !== result.challenge) {
      res.status(401).json({ error: "Login expired or does not belong to this device. Start again." }); return;
    }
    handoffs.delete(loginCode);
    res.cookie(COOKIE_NAME, result.token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
    res.json({ app_session_id: result.token, user: result.user });
  });
}
