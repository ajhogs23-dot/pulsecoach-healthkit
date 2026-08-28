export function calculateBmi(weightKg: number, heightCm: number) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return null;
  const metres = heightCm / 100;
  return Number((weightKg / (metres * metres)).toFixed(1));
}

export function goalPaceLabel(pace: "cautious" | "steady" | "slower") {
  return pace === "cautious" ? "More recovery room" : pace === "steady" ? "Balanced focus" : "Gentler routine";
}

export function hydrationGlassesLogged(glasses: number, max = 8) {
  return Math.min(max, Math.max(0, Math.floor(glasses)));
}

export function routeSharingLabel(scope: "private" | "totals" | "route") {
  if (scope === "route") return "Route breadcrumbs visible to approved friends";
  if (scope === "totals") return "Activity totals only";
  return "Private by default";
}

export function virtualChallengePoints(activeMinutes: number, completedSessions: number) {
  return Math.max(0, Math.floor(activeMinutes)) + Math.max(0, Math.floor(completedSessions)) * 100;
}
