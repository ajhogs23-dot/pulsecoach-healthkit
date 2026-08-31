export type CatalogMatch = { barcode?: string; name: string; brand?: string; imageUrl?: string; country?: string; source: string; sourceId?: string; verifiedAt: string | null; confidence: number; quality: "complete" | "partial" | "needs_confirmation"; nutrients: Record<string, number | null>; ingredients?: string; allergens?: string };

function numberOrNull(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }

export async function lookupOpenFoodFacts(barcode: string): Promise<CatalogMatch | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, { headers: { "User-Agent": "VELTURA/1.0 (nutrition lookup)" } });
  if (!response.ok) return null;
  const payload = await response.json() as { status?: number; product?: Record<string, unknown> };
  if (payload.status !== 1 || !payload.product) return null;
  const product = payload.product;
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const name = String(product.product_name ?? product.product_name_en ?? "Unconfirmed product");
  const completeness = [product.product_name, product.brands, nutriments.energy_kcal_100g, nutriments.proteins_100g, nutriments.carbohydrates_100g].filter(Boolean).length;
  return { barcode, name, brand: product.brands ? String(product.brands) : undefined, imageUrl: product.image_front_url ? String(product.image_front_url) : undefined, country: product.countries ? String(product.countries).split(",")[0] : undefined, source: "Open Food Facts", sourceId: barcode, verifiedAt: product.last_modified_t ? new Date(Number(product.last_modified_t) * 1000).toISOString() : null, confidence: completeness >= 5 ? 92 : 70, quality: completeness >= 5 ? "complete" : "partial", nutrients: { calories: numberOrNull(nutriments.energy_kcal_100g), kilojoules: numberOrNull(nutriments.energy_100g), protein: numberOrNull(nutriments.proteins_100g), carbohydrates: numberOrNull(nutriments.carbohydrates_100g), sugars: numberOrNull(nutriments.sugars_100g), fat: numberOrNull(nutriments.fat_100g), saturatedFat: numberOrNull(nutriments['saturated-fat_100g']), fibre: numberOrNull(nutriments.fiber_100g), sodium: numberOrNull(nutriments.sodium_100g) }, ingredients: product.ingredients_text ? String(product.ingredients_text) : undefined, allergens: product.allergens ? String(product.allergens) : undefined };
}

export async function resolveProduct(input: { barcode?: string; query?: string }): Promise<{ matches: CatalogMatch[]; providerStatus: Record<string, "matched" | "no_match" | "unavailable" | "not_configured"> }> {
  if (input.barcode) {
    try { const match = await lookupOpenFoodFacts(input.barcode); return { matches: match ? [match] : [], providerStatus: { openFoodFacts: match ? "matched" : "no_match", fsanz: "not_configured", usda: "not_configured", nih: "not_configured" } }; } catch { return { matches: [], providerStatus: { openFoodFacts: "unavailable", fsanz: "not_configured", usda: "not_configured", nih: "not_configured" } }; }
  }
  return { matches: [], providerStatus: { openFoodFacts: "not_configured", fsanz: "not_configured", usda: "not_configured", nih: "not_configured" } };
}
