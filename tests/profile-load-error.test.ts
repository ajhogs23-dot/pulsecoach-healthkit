import { describe, expect, it } from "vitest";
import { profileLoadError } from "../lib/profile-load-error";

describe("Personal Details load failures", () => {
  it("offers sign-in instead of repeatedly retrying an expired session", () => {
    expect(profileLoadError(new Error("Sign in to access your personal details."))).toMatchObject({ requiresSignIn: true });
    expect(profileLoadError(new Error("Please login (10001)"))).toMatchObject({ requiresSignIn: true });
  });
  it("keeps connection failures retryable", () => {
    expect(profileLoadError(new Error("Network request failed"))).toMatchObject({ requiresSignIn: false });
    expect(profileLoadError(new Error("Profile request timed out")).message).toContain("too long");
  });
  it("keeps a missing-procedure error visible instead of calling it a connection problem", () => {
    expect(profileLoadError(new Error("Missing procedure profile.personalDetails")).message).toContain("Missing procedure profile.personalDetails");
  });
});
