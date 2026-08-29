import type { FoodNutrition } from "@/lib/food-log";

export type CatalogueItem = {
  id: string;
  name: string;
  brand: string;
  detail: string;
  source: string;
  imageUrl?: string;
  barcode?: string;
  country?: string;
  stores?: string;
  categories?: string[];
  nutritionAvailable?: boolean;
  nutrition: FoodNutrition;
};

const nutrition = (calories: number, protein: number, carbohydrates: number, fat: number, fibre = 0, sugars = 0, sodium = 0): FoodNutrition =>
  ({ calories, protein, carbohydrates, fat, fibre, sugars, sodium });

export const commonFoods: CatalogueItem[] = [
  ["banana","Banana","Common food","1 medium",105,1.3,27,0.4,3.1,14,1],
  ["apple","Apple","Common food","1 medium",95,0.5,25,0.3,4.4,19,2],
  ["orange","Orange","Common food","1 medium",62,1.2,15.4,0.2,3.1,12.2,0],
  ["strawberries","Strawberries","Common food","1 cup",49,1,11.7,0.5,3,7.4,2],
  ["blueberries","Blueberries","Common food","1 cup",84,1.1,21.4,0.5,3.6,14.7,1],
  ["avocado","Avocado","Common food","1 medium",240,3,12.8,22,10,0.7,11],
  ["egg","Egg","Common food","1 large",72,6.3,0.4,4.8,0,0.2,71],
  ["chicken-breast","Chicken breast","Common food","100 g cooked",165,31,0,3.6,0,0,74],
  ["chicken-thigh","Chicken thigh","Common food","100 g cooked",209,26,0,10.9,0,0,90],
  ["beef-mince-lean","Lean beef mince","Common food","100 g cooked",217,26,0,12,0,0,72],
  ["steak-sirloin","Sirloin steak","Common food","100 g cooked",206,27,0,10,0,0,55],
  ["salmon","Salmon","Common food","100 g cooked",206,22,0,12,0,0,59],
  ["tuna","Tuna in springwater","Common food","95 g drained can",105,23,0,1,0,0,300],
  ["prawns","Prawns","Common food","100 g cooked",99,24,0.2,0.3,0,0,111],
  ["tofu","Firm tofu","Common food","100 g",144,17,2.8,8.7,2.3,0.6,14],
  ["rice-white","White rice","Common food","1 cup cooked",205,4.3,44.5,0.4,0.6,0.1,2],
  ["rice-brown","Brown rice","Common food","1 cup cooked",216,5,44.8,1.8,3.5,0.7,10],
  ["pasta","Pasta","Common food","1 cup cooked",221,8.1,43.2,1.3,2.5,0.8,1],
  ["bread-wholemeal","Wholemeal bread","Common food","2 slices",180,8,30,2.5,5,3,330],
  ["oats","Rolled oats","Common food","50 g dry",190,6.5,32,3.5,5,0.5,2],
  ["potato","Potato","Common food","1 medium baked",161,4.3,36.6,0.2,3.8,2,17],
  ["sweet-potato","Sweet potato","Common food","1 medium baked",112,2,26,0.1,3.9,5.4,72],
  ["broccoli","Broccoli","Common food","1 cup cooked",55,3.7,11.2,0.6,5.1,2.2,64],
  ["spinach","Spinach","Common food","1 cup raw",7,0.9,1.1,0.1,0.7,0.1,24],
  ["mixed-vegetables","Mixed vegetables","Common food","1 cup cooked",120,5,24,1,7,8,80],
  ["greek-yoghurt","Greek yoghurt","Generic","170 g tub",150,16,12,4,0,9,70],
  ["milk-full","Full cream milk","Generic","250 ml",160,8.3,12,8.5,0,12,105],
  ["milk-light","Light milk","Generic","250 ml",115,9,12,3.5,0,12,110],
  ["cottage-cheese","Cottage cheese","Generic","100 g",98,11,3.4,4.3,0,2.7,364],
  ["cheddar","Cheddar cheese","Generic","30 g",121,7.5,0.4,10,0,0.1,186],
  ["peanut-butter","Peanut butter","Generic","1 tablespoon",94,3.5,3.2,8,1,1.5,75],
  ["almonds","Almonds","Common food","30 g",174,6.4,6.5,15,3.8,1.3,1],
  ["olive-oil","Olive oil","Common food","1 tablespoon",119,0,0,13.5,0,0,0],
  ["wrap","Wholemeal wrap","Generic","1 medium",190,6,32,4.5,5,2,390],
  ["bacon","Bacon","Generic","2 cooked rashers",87,6,0.3,6.8,0,0.2,370],
  ["sausage","Beef sausage","Generic","1 sausage",210,10,4,17,0,1,500],
  ["beans","Baked beans","Generic","220 g can",180,10,31,1,8,10,750],
  ["chickpeas","Chickpeas","Common food","1 cup cooked",269,14.5,45,4.2,12.5,8,11],
  ["protein-bar","Protein bar","Generic","1 bar",210,20,22,7,5,4,180],
].map(([id,name,brand,detail,calories,protein,carbohydrates,fat,fibre,sugars,sodium]) => ({
  id: String(id), name: String(name), brand: String(brand), detail: String(detail), source: "Generic estimate",
  nutrition: nutrition(Number(calories), Number(protein), Number(carbohydrates), Number(fat), Number(fibre), Number(sugars), Number(sodium)),
}));

const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

const text = (value: unknown) => String(value ?? "").trim();

const isAustralianProduct = (product: any) => {
  const countries = [
    ...(Array.isArray(product.countries_tags) ? product.countries_tags : []),
    text(product.countries),
  ].join(" ").toLowerCase();
  const stores = text(product.stores).toLowerCase();
  return countries.includes("australia") || /woolworths|coles|aldi|iga/.test(stores);
};

const productScore = (product: any, term: string) => {
  const name = text(product.product_name || product.product_name_en).toLowerCase();
  const brand = text(product.brands).toLowerCase();
  const query = term.toLowerCase();
  let score = isAustralianProduct(product) ? 100 : 0;
  if (name === query) score += 60;
  else if (name.startsWith(query)) score += 35;
  else if (name.includes(query)) score += 20;
  if (brand.includes(query)) score += 10;
  if (text(product.image_front_small_url || product.image_small_url || product.image_front_url)) score += 5;
  if (text(product.serving_size)) score += 5;
  return score;
};

export const catalogueItemsFromResponse = (data: { hits?: any[]; products?: any[] }, term = "", options: { requireCalories?: boolean } = {}): CatalogueItem[] =>
  (data.hits ?? data.products ?? [])
    .filter((product) => product && typeof product === "object")
    .sort((a, b) => productScore(b, term) - productScore(a, term))
    .flatMap((product): CatalogueItem[] => {
      const name = text(product.product_name || product.product_name_en);
      const n = product.nutriments ?? {};
      const rawCalories = n["energy-kcal_100g"];
      const hasCalories = typeof rawCalories === "number" && Number.isFinite(rawCalories);
      const calories100g = num(rawCalories);
      if (!name || ((options.requireCalories ?? true) && !hasCalories)) return [];
      const servingText = text(product.serving_size);
      const servingGrams = Number.parseFloat(servingText);
      const factor = Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams / 100 : 1;
      const label = servingText || (hasCalories ? "100 g" : "Serving not supplied");
      const country = isAustralianProduct(product) ? "Australia" : text(product.countries).split(",")[0] || undefined;
      const categories = Array.isArray(product.categories_tags) ? product.categories_tags.map(text).filter(Boolean) : [];
      return [{
        id: `off-${product.code ?? name}-${text(product.brands)}`,
        barcode: text(product.code) || undefined,
        name,
        brand: text(product.brands).split(",")[0] || "Packaged product",
        detail: hasCalories ? `${label} · ${Math.round(calories100g * factor)} kcal` : `${label} · confirm label`,
        source: country === "Australia" ? "Open Food Facts · Australia" : "Open Food Facts",
        imageUrl: text(product.image_front_small_url || product.image_small_url || product.image_front_url) || undefined,
        country,
        stores: text(product.stores) || undefined,
        categories,
        nutritionAvailable: hasCalories,
        nutrition: nutrition(
          calories100g * factor,
          num(n.proteins_100g) * factor,
          num(n.carbohydrates_100g) * factor,
          num(n.fat_100g) * factor,
          num(n.fiber_100g) * factor,
          num(n.sugars_100g) * factor,
          num(n.sodium_100g) * 1000 * factor,
        ),
      }];
    });

const fields = [
  "code", "product_name", "product_name_en", "brands", "serving_size", "quantity",
  "nutriments", "image_front_small_url", "image_small_url", "image_front_url",
  "countries", "countries_tags", "stores", "categories_tags",
].join(",");

const SEARCH_TIMEOUT_MS = 8_000;
const requestHeaders = {
  Accept: "application/json",
  "X-User-Agent": "PulseCoach/1.0 (Open Food Facts search)",
};

export class CatalogueSearchError extends Error {
  constructor(message: string, readonly causes: string[] = []) {
    super(message);
    this.name = "CatalogueSearchError";
  }
}

const errorSummary = (error: unknown) => {
  if (error instanceof Error) return error.name === "AbortError" ? "request timed out" : error.message;
  return "unknown network error";
};

async function fetchWithTimeout(url: string, externalSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SEARCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal, headers: requestHeaders });
  } catch (error) {
    if (externalSignal?.aborted) throw error;
    if (timedOut) throw new CatalogueSearchError(`request timed out after ${SEARCH_TIMEOUT_MS / 1000} seconds`);
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}

export async function searchOpenFoodFacts(query: string, signal?: AbortSignal, options: { requireCalories?: boolean } = {}): Promise<CatalogueItem[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const failures: string[] = [];
  const primaryParams = new URLSearchParams({
    q: term,
    langs: "en",
    page: "1",
    page_size: "100",
    fields,
  });

  try {
    const primary = await fetchWithTimeout(`https://search.openfoodfacts.org/search?${primaryParams.toString()}`, signal);
    if (primary.ok) {
      const results = catalogueItemsFromResponse(await primary.json(), term, options);
      if (results.length) return results.slice(0, 50);
      failures.push("primary search returned no usable product records");
    } else failures.push(`primary search returned HTTP ${primary.status}`);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    failures.push(`primary search: ${errorSummary(error)}`);
  }

  const params = new URLSearchParams({
    search_terms: term,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "100",
    fields,
  });
  try {
    const fallback = await fetchWithTimeout(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, signal);
    if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
    const results = catalogueItemsFromResponse(await fallback.json(), term, options).slice(0, 50);
    if (typeof __DEV__ !== "undefined" && __DEV__ && failures.length) console.warn("[OpenFoodFacts] Primary failed; fallback completed.", failures.join("; "));
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    failures.push(`fallback search: ${errorSummary(error)}`);
    if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[OpenFoodFacts] Search failed.", failures.join("; "));
    throw new CatalogueSearchError("Open Food Facts could not be reached. Check your connection and try again.", failures);
  }
}

export const isLikelySupplement = (item: CatalogueItem) => {
  const productIdentity = `${item.name} ${item.brand}`.toLowerCase();
  const categories = (item.categories ?? []).join(" ").toLowerCase();
  const clearlyNamedSupplement = [
    /\b(?:whey|casein)(?:\s+protein)?(?:\s+(?:powder|isolate|concentrate))?\b/,
    /\bprotein\s+(?:powder|supplement|isolate|concentrate)\b/,
    /\bcreatine(?:\s+monohydrate)?\b/,
    /\b(?:pre|post)[-\s]?workout\b/,
    /\belectrolyte(?:s)?\s+(?:powder|mix|supplement|tablets?|capsules?)\b/,
    /\b(?:bcaa|eaa|amino(?:\s+acid)?s?)\b/,
    /\bmass[-\s]?gainer\b/,
    /\bmeal[-\s]?replacement\s+(?:powder|shake|supplement)\b/,
    /\bsports?\s+supplement\b/,
    /\bmultivitamins?\b/,
    /\bvitamin(?:s|\s+[a-k](?:\d{1,2})?)?\s+(?:supplement|tablets?|capsules?|gummies|powder)\b/,
    /\b(?:magnesium|zinc|iron|calcium|mineral)\s+(?:supplement|tablets?|capsules?|gummies|powder)\b/,
  ].some((pattern) => pattern.test(productIdentity));
  if (clearlyNamedSupplement) return true;

  return /\b(?:dietary-supplements?|bodybuilding-supplements?|sports?-supplements?|protein-powders?|creatine-supplements?|pre-workout-supplements?|post-workout-supplements?|amino-acid-supplements?|meal-replacement-powders?|mass-gainers?)\b/.test(categories);
};

export async function searchSupplementProducts(query: string, signal?: AbortSignal): Promise<CatalogueItem[]> {
  const results = await searchOpenFoodFacts(query, signal, { requireCalories: false });
  return results.filter(isLikelySupplement).slice(0, 30);
}

export async function searchFoodProducts(query: string, signal?: AbortSignal): Promise<CatalogueItem[]> {
  const results = await searchOpenFoodFacts(query, signal);
  return results.filter((item) => !isLikelySupplement(item)).slice(0, 50);
}
