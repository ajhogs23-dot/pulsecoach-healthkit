export type SupplementProduct = {
  id: string;
  name: string;
  brand: string;
  form?: string;
  servingLabel?: string;
  activeIngredients?: string;
  imageUrl?: string;
  source: string;
};

const generic = (id: string, name: string, form: string, activeIngredients: string): SupplementProduct => ({
  id, name, brand: "Generic", form, activeIngredients, source: "Generic category — confirm product label",
});

export const commonSupplements: SupplementProduct[] = [
  generic("creatine-monohydrate", "Creatine monohydrate", "Powder", "Creatine monohydrate"),
  generic("whey-protein", "Whey protein", "Powder", "Whey protein"),
  generic("casein-protein", "Casein protein", "Powder", "Micellar casein"),
  generic("plant-protein", "Plant protein", "Powder", "Pea, soy or blended plant protein"),
  generic("pre-workout", "Pre-workout", "Powder", "Varies — check caffeine and stimulant amounts"),
  generic("electrolytes", "Electrolytes", "Powder/tablet", "Sodium, potassium and/or magnesium"),
  generic("multivitamin", "Multivitamin", "Tablet/capsule", "Vitamins and minerals vary by label"),
  generic("vitamin-d", "Vitamin D", "Capsule/tablet", "Vitamin D"),
  generic("vitamin-c", "Vitamin C", "Tablet/powder", "Ascorbic acid"),
  generic("vitamin-b12", "Vitamin B12", "Tablet", "Cobalamin"),
  generic("iron", "Iron", "Tablet", "Iron — use with professional guidance when appropriate"),
  generic("magnesium", "Magnesium", "Powder/capsule", "Magnesium compound varies by label"),
  generic("zinc", "Zinc", "Tablet/capsule", "Zinc"),
  generic("fish-oil", "Fish oil / omega-3", "Capsule/liquid", "EPA and DHA"),
  generic("probiotic", "Probiotic", "Capsule/powder", "Strains and CFU vary by label"),
  generic("fibre", "Fibre supplement", "Powder/capsule", "Psyllium or other fibre"),
  generic("collagen", "Collagen peptides", "Powder", "Hydrolysed collagen"),
  generic("beta-alanine", "Beta-alanine", "Powder", "Beta-alanine"),
  generic("citrulline", "Citrulline", "Powder", "L-citrulline or citrulline malate"),
  generic("caffeine", "Caffeine supplement", "Tablet/powder", "Caffeine — confirm amount carefully"),
];

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function searchSupplementProducts(query: string, signal?: AbortSignal): Promise<SupplementProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "30",
    fields: "code,product_name,brands,quantity,serving_size,ingredients_text,image_front_small_url,categories",
  });
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
    signal,
    headers: { "User-Agent": "PulseCoach/1.0 (product label search)" },
  });
  if (!response.ok) throw new Error(`Supplement search failed: ${response.status}`);
  const data = await response.json() as { products?: any[] };
  return (data.products ?? []).flatMap((product): SupplementProduct[] => {
    const name = clean(product.product_name);
    if (!name) return [];
    const haystack = `${name} ${clean(product.categories)} ${clean(product.ingredients_text)}`.toLowerCase();
    const supplementLike = /protein|creatine|vitamin|mineral|magnesium|zinc|iron|electrolyte|omega|fish oil|pre-workout|probiotic|collagen|amino|caffeine|supplement/.test(haystack);
    if (!supplementLike) return [];
    return [{
      id: `off-${clean(product.code) || name}-${clean(product.brands)}`,
      name,
      brand: clean(product.brands) || "Brand not listed",
      form: clean(product.quantity) || undefined,
      servingLabel: clean(product.serving_size) || undefined,
      activeIngredients: clean(product.ingredients_text).slice(0, 260) || undefined,
      imageUrl: clean(product.image_front_small_url) || undefined,
      source: "Open Food Facts community label",
    }];
  });
}
