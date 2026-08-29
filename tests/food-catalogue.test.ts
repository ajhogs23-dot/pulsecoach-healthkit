import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogueItemsFromResponse, commonFoods, isLikelySupplement, searchFoodProducts, searchOpenFoodFacts, searchSupplementProducts } from "../lib/food-catalogue";

afterEach(() => vi.unstubAllGlobals());

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

  it("keeps label-only supplement products while nutrition search stays strict", () => {
    const payload = { products: [{ code: "supp-1", product_name: "Creatine monohydrate", brands: "Sports Lab", nutriments: {} }] };
    expect(catalogueItemsFromResponse(payload, "creatine")).toEqual([]);
    const [supplement] = catalogueItemsFromResponse(payload, "creatine", { requireCalories: false });
    expect(supplement.name).toBe("Creatine monohydrate");
    expect(supplement.nutritionAvailable).toBe(false);
    expect(supplement.detail).toContain("confirm label");
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

  it("falls back when the primary search provider is unavailable", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ products: [{
        code: "5",
        product_name: "Australian oats",
        countries_tags: ["en:australia"],
        nutriments: { "energy-kcal_100g": 380 },
      }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchOpenFoodFacts("oats");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("https://search.openfoodfacts.org/search?");
    expect(fetchMock.mock.calls[0][0]).toContain("q=oats");
    expect(fetchMock.mock.calls[1][0]).toContain("https://world.openfoodfacts.org/cgi/search.pl?");
    expect(results[0].name).toBe("Australian oats");
  });

  it("falls back when the primary returns no usable nutrition records", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [{ product_name: "Unlabelled food", nutriments: {} }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ products: [{
        code: "6",
        product_name: "Labelled food",
        nutriments: { "energy-kcal_100g": 120 },
      }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchOpenFoodFacts("labelled");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results[0].name).toBe("Labelled food");
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

  it("excludes cheese and ordinary dairy even when categories mention protein", () => {
    const products = catalogueItemsFromResponse({ products: [
      {
        code: "cheese-1",
        product_name: "Cheddar cheese",
        brands: "Everyday Dairy",
        categories_tags: ["en:dairies", "en:cheeses", "en:protein"],
        nutriments: { "energy-kcal_100g": 400 },
      },
      {
        code: "milk-1",
        product_name: "Full cream milk",
        brands: "Local Dairy",
        categories_tags: ["en:dairies", "en:milks", "en:protein-drinks"],
        nutriments: { "energy-kcal_100g": 65 },
      },
      {
        code: "yoghurt-1",
        product_name: "Greek yoghurt",
        brands: "Local Dairy",
        categories_tags: ["en:dairies", "en:yogurts", "en:high-protein-foods"],
        nutriments: { "energy-kcal_100g": 90 },
      },
    ] }, "protein");
    expect(products.map(isLikelySupplement)).toEqual([false, false, false]);
  });

  it("retains whey protein powder and creatine products", () => {
    const products = catalogueItemsFromResponse({ products: [
      {
        code: "whey-1",
        product_name: "Whey protein powder",
        brands: "Sports Lab",
        categories_tags: ["en:protein-powders"],
        nutriments: { "energy-kcal_100g": 380 },
      },
      {
        code: "creatine-1",
        product_name: "Creatine monohydrate",
        brands: "Sports Lab",
        categories_tags: ["en:dietary-supplements"],
        nutriments: {},
      },
    ] }, "sports", { requireCalories: false });
    expect(products).toHaveLength(2);
    expect(products.every(isLikelySupplement)).toBe(true);
  });

  it("never falls back to ordinary foods when a supplement search has no credible match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hits: [{
      code: "cheese-2",
      product_name: "Protein cheese slices",
      categories_tags: ["en:dairies", "en:cheeses", "en:protein"],
      nutriments: { "energy-kcal_100g": 300 },
    }] }) }));
    await expect(searchSupplementProducts("cheese")).resolves.toEqual([]);
  });

  it("excludes creatine and whey powder from Nutrition search", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hits: [
      {
        code: "creatine-food-search",
        product_name: "Creatine monohydrate",
        categories_tags: ["en:dietary-supplements"],
        nutriments: { "energy-kcal_100g": 0 },
      },
      {
        code: "whey-food-search",
        product_name: "Whey protein powder",
        categories_tags: ["en:protein-powders"],
        nutriments: { "energy-kcal_100g": 380 },
      },
    ] }) }));
    await expect(searchFoodProducts("powder")).resolves.toEqual([]);
  });

  it("keeps ordinary and high-protein foods in Nutrition search", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hits: [
      { code: "food-cheese", product_name: "Cheddar cheese", categories_tags: ["en:dairies", "en:protein"], nutriments: { "energy-kcal_100g": 400 } },
      { code: "food-milk", product_name: "High protein milk", categories_tags: ["en:dairies", "en:milks", "en:protein-drinks"], nutriments: { "energy-kcal_100g": 65 } },
      { code: "food-chicken", product_name: "Chicken breast", categories_tags: ["en:meats"], nutriments: { "energy-kcal_100g": 165 } },
      { code: "food-yoghurt", product_name: "High protein Greek yoghurt", categories_tags: ["en:dairies", "en:yogurts", "en:high-protein-foods"], nutriments: { "energy-kcal_100g": 90 } },
    ] }) }));
    const results = await searchFoodProducts("protein food");
    expect(results.map((item) => item.name)).toEqual(["Cheddar cheese", "High protein milk", "Chicken breast", "High protein Greek yoghurt"]);
  });

  it("does not include a hard-coded whey supplement in Nutrition Quick Add", () => {
    expect(commonFoods.some((item) => /\bwhey\b/i.test(item.name))).toBe(false);
  });
});
