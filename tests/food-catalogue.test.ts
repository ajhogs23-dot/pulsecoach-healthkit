import { describe, expect, it } from "vitest";
import { catalogueItemsFromResponse, isLikelySupplement } from "../lib/food-catalogue";

describe("live catalogue mapping", () => {
  it("ranks Australian supermarket products before global matches", () => {
    const results = catalogueItemsFromResponse({ products: [
      { code: "1", product_name: "Protein Milk", brands: "Global Brand", countries: "United States", nutriments: { "energy-kcal_100g": 50 } },
      { code: "2", product_name: "Protein Milk", brands: "Local Brand", countries_tags: ["en:australia"], stores: "Woolworths", nutriments: { "energy-kcal_100g": 60 } },
    ] }, "protein milk");
    expect(results[0].barcode).toBe("2");
    expect(results[0].source).toContain("Australia");
    expect(results[0].stores).toBe("Woolworths");
  });

  it("omits products without a name or usable calorie data", () => {
    const results = catalogueItemsFromResponse({ products: [
      { code: "1", product_name: "Unknown nutrition", nutriments: {} },
      { code: "2", nutriments: { "energy-kcal_100g": 100 } },
    ] }, "unknown");
    expect(results).toEqual([]);
  });

  it("scales label nutrition to a supplied serving size", () => {
    const [result] = catalogueItemsFromResponse({ products: [{
      code: "3",
      product_name: "Protein bar",
      serving_size: "50 g",
      nutriments: { "energy-kcal_100g": 400, proteins_100g: 20, carbohydrates_100g: 40, fat_100g: 10 },
    }] }, "protein bar");
    expect(result.detail).toContain("200 kcal");
    expect(result.nutrition.protein).toBe(10);
  });

  it("recognises common sports supplement products", () => {
    const [result] = catalogueItemsFromResponse({ products: [{
      code: "4",
      product_name: "Creatine monohydrate",
      brands: "Australian Sports",
      nutriments: { "energy-kcal_100g": 0 },
    }] }, "creatine");
    expect(isLikelySupplement(result)).toBe(true);
  });
});
