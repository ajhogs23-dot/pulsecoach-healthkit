import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(req: Request):
  Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const forwarded = req.headers["x-forwarded-proto"];
  const protocols = Array.isArray(forwarded) ? forwarded : (forwarded || "").split(",");
  const secure = req.protocol === "https" || protocols.some((value) => value.trim() === "https");
  // Host-only cookies work on Railway and cannot be shared with unrelated services.
  return { domain: undefined, httpOnly: true, path: "/", sameSite: secure ? "none" : "lax", secure };
}
