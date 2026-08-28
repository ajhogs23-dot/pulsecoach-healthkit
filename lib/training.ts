export type TrainingDay = { day: string; focus: string; status: "planned" | "rest" };

export function buildWeeklyPlan(count: number, focuses: string[]) {
  const safeCount = Math.min(7, Math.max(1, Math.floor(count)));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, index): TrainingDay => ({
    day,
    focus: index < safeCount ? focuses[index] || "Training focus" : "Rest",
    status: index < safeCount ? "planned" : "rest",
  }));
}

export function shouldModifyExercise(limitation: string, exercise: string) {
  const text = `${limitation} ${exercise}`.toLowerCase();
  return ["pain", "injury", "surgery", "shoulder", "knee", "back", "wrist"].some((term) => text.includes(term));
}
