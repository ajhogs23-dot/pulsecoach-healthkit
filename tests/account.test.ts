import { describe, expect, it } from "vitest";
import { identityLinkingCopy, isValidAccountForm } from "../lib/account";

describe("account helpers", () => {
  it("validates email and minimum password length", () => {
    expect(isValidAccountForm("alex@example.com", "password")).toBe(true);
    expect(isValidAccountForm("alex", "password")).toBe(false);
    expect(isValidAccountForm("alex@example.com", "short")).toBe(false);
  });
  it("explains provider linking instead of duplicate profiles", () => {
    expect(identityLinkingCopy("Apple")).toContain("existing VELTURA account");
  });
});
