import { describe, expect, it } from "vitest";

import {
  buildOAuthLoginUrl,
  MANAGED_PUBLIC_DEFAULTS,
} from "../constants/public-config";

describe("standalone OAuth configuration", () => {
  it("has safe public managed defaults", () => {
    expect(MANAGED_PUBLIC_DEFAULTS.portal).toBe("https://manus.im");
    expect(MANAGED_PUBLIC_DEFAULTS.server).toBe("https://api.manus.im");
    expect(MANAGED_PUBLIC_DEFAULTS.appId).toBe("CkXq3pRLPFCvmuDvGFNRXZ");
    expect(MANAGED_PUBLIC_DEFAULTS.ownerId).toBe("HWKtAfSvxLG3ZCdMNvQvbL");
    expect(MANAGED_PUBLIC_DEFAULTS.ownerName).toBe("Andrew Hoggan");
    expect(MANAGED_PUBLIC_DEFAULTS.apiBaseUrl).toMatch(/^https:\/\//);
  });

  it("builds an absolute OAuth URL instead of /app-auth", () => {
    const loginUrl = new URL(
      buildOAuthLoginUrl({
        portal: MANAGED_PUBLIC_DEFAULTS.portal,
        appId: MANAGED_PUBLIC_DEFAULTS.appId,
        redirectUri: "manuspulsecoach://oauth/callback",
        state: "test-state",
      }),
    );
    expect(loginUrl.origin).toBe("https://manus.im");
    expect(loginUrl.pathname).toBe("/app-auth");
    expect(loginUrl.searchParams.get("appId")).toBe(MANAGED_PUBLIC_DEFAULTS.appId);
    expect(loginUrl.searchParams.get("redirectUri")).toBe("manuspulsecoach://oauth/callback");
  });
});
