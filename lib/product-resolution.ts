export type NutrientProfile = { calories: number; kilojoules: number; protein: number; carbohydrates: number; sugars: number; fat: number; saturatedFat: number; fibre: number; sodium: number };

export type ProductCandidate = { id: string; name: string; brand?: string; flavour?: string; sizeGrams?: number; country?: string; source: string; confidence: number };

export function scaleNutrition(per100g: NutrientProfile, amountGrams: number) {
  const multiplier = Math.max(0, amountGrams) / 100;
  return Object.fromEntries(Object.entries(per100g).map(([key, value]) => [key, Number((value * multiplier).toFixed(2))])) as NutrientProfile;
}

export function portionToGrams(value: number, unit: "g" | "ml" | "serve" | "half-pack", referenceGrams = 100) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (unit === "half-pack") return referenceGrams * 0.5 * value;
  if (unit === "serve") return referenceGrams * value;
  return value;
}

export function rankProductCandidate(query: { barcode?: string; brand?: string; name?: string; flavour?: string; country?: string }, candidate: ProductCandidate) {
  let score = 0;
  if (query.barcode && candidate.id === query.barcode) score += 60;
  const haystack = `${candidate.brand ?? ""} ${candidate.name} ${candidate.flavour ?? ""}`.toLowerCase();
  if (query.brand && haystack.includes(query.brand.toLowerCase())) score += 15;
  if (query.name && haystack.includes(query.name.toLowerCase())) score += 15;
  if (query.flavour && haystack.includes(query.flavour.toLowerCase())) score += 5;
  if (query.country && candidate.country === query.country) score += 5;
  return Math.min(100, score);
}

export function confidenceLabel(score: number) {
  if (score >= 85) return "High confidence";
  if (score >= 60) return "Review match";
  return "Confirm carefully";
}
