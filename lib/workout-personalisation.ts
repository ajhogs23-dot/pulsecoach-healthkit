export type Readiness = "Low" | "Okay" | "Ready";

type ExerciseLike = { name: string; focus: string };
type WorkoutLike = { completedAt: string; exercises: Array<{ name: string; completedSets: unknown[] }> };

const painPatterns: Array<[RegExp, RegExp]> = [
  [/shoulder/i, /press|fly|raise|dip/i],
  [/knee/i, /squat|lunge|leg press|step-up/i],
  [/back|lower back/i, /deadlift|bent-over|good morning/i],
  [/wrist|elbow/i, /curl|pressdown|push-up|dip/i],
];

export function orderExercisesForRecovery<T extends ExerciseLike>(
  exercises: T[],
  history: WorkoutLike[],
  limitation: string,
  now = new Date(),
): T[] {
  const blocked = painPatterns.filter(([word]) => word.test(limitation)).map(([, exercise]) => exercise);
  const safe = exercises.filter((exercise) => !blocked.some((pattern) => pattern.test(exercise.name)));
  const cutoff = now.getTime() - 72 * 60 * 60 * 1000;
  const recent = new Set(history.filter((workout) => new Date(workout.completedAt).getTime() >= cutoff).flatMap((workout) => workout.exercises.filter((exercise) => exercise.completedSets.length > 0).map((exercise) => exercise.name)));
  return [...safe].sort((a, b) => Number(recent.has(a.name)) - Number(recent.has(b.name)));
}

export function setCountForReadiness(goal: string, readiness: Readiness) {
  if (readiness === "Low") return 2;
  if (goal === "Build strength" && readiness === "Ready") return 3;
  return 3;
}

export function durationForReadiness(requestedMinutes: number, readiness: Readiness) {
  const safe = Math.max(10, Math.min(180, Math.round(requestedMinutes || 30)));
  return readiness === "Low" ? Math.min(safe, 30) : safe;
}
