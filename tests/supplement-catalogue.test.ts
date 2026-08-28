import { describe, expect, it } from "vitest";
import { commonSupplements } from "../lib/supplement-catalogue";

describe("supplement catalogue", () => {
  it("covers common supplement categories", () => {
    const names = commonSupplements.map((item) => item.name.toLowerCase());
    expect(names.some((name) => name.includes("creatine"))).toBe(true);
    expect(names.some((name) => name.includes("whey"))).toBe(true);
    expect(names.some((name) => name.includes("electrolyte"))).toBe(true);
    expect(names.some((name) => name.includes("magnesium"))).toBe(true);
  });

  it("uses unique stable identifiers", () => {
    expect(new Set(commonSupplements.map((item) => item.id)).size).toBe(commonSupplements.length);
  });

  it("marks generic records for label confirmation", () => {
    expect(commonSupplements.every((item) => item.source.includes("confirm product label"))).toBe(true);
  });
});
