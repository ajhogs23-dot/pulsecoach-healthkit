export type ShareCategory = "Weight trend" | "BMI" | "Steps" | "Workouts" | "Active minutes" | "Calories" | "Nutrition progress" | "Route breadcrumbs";

export function toggleShareCategory(selected: ShareCategory[], category: ShareCategory) {
  return selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category];
}

export function competitionVisibility(selectedMetric: ShareCategory, shared: ShareCategory[]) {
  return shared.includes(selectedMetric) ? "Competition metric visible" : "Competition metric hidden until consent is granted";
}

export function defaultFriendShares(): ShareCategory[] {
  return [];
}
