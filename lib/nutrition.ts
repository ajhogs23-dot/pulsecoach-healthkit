export const MOTIVATION_LINES = [
  "Stay steady.",
  "You’re building momentum.",
  "Show up for yourself.",
  "One good choice at a time.",
  "Strong habits compound.",
] as const;

export function motivationForMinute(minute: number) {
  return MOTIVATION_LINES[Math.abs(Math.floor(minute)) % MOTIVATION_LINES.length];
}

export function matchPantryIngredients(ingredients: string[], recipeIngredients: string[]) {
  const pantry = new Set(ingredients.map((item) => item.trim().toLowerCase()));
  return recipeIngredients.filter((item) => pantry.has(item.trim().toLowerCase())).length;
}

export function safeSupplementTimingLabel(category: string) {
  const normalized = category.trim().toLowerCase();
  if (normalized.includes("pre-workout")) return "Before workout · follow the product label";
  if (normalized.includes("protein")) return "Post-workout or whenever it fits your day";
  if (normalized.includes("evening")) return "Evening · confirm suitability with a clinician or pharmacist";
  return "Choose timing from the product label or a qualified professional";
}

export const PEPTIDE_SAFETY_COPY = "PulseCoach does not select peptides, provide doses, calculate vial mixing, or convert doses into injection units.";
