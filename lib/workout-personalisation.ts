export type Readiness = "Low" | "Okay" | "Ready";

type ExerciseLike = { name: string; focus: string; muscleGroup?: string };
type WorkoutLike = { completedAt: string; exercises: Array<{ name: string; completedSets: unknown[] }> };

const painConflicts: Array<[RegExp, RegExp]> = [
  [/shoulder/i, /shoulder|chest|back|overhead|press|push-up|fly|raise|dip|row|pull-up|pulldown|battle rope|boxing|burpee/i],
  [/knee/i, /squat|lunge|leg press|step-up|jump|stair/i],
  [/(?:lower )?back|spine/i, /deadlift|romanian|bent-over|good morning|back extension/i],
  [/wrist|elbow/i, /curl|pressdown|push-up|dip|skull crusher/i],
  [/hip/i, /squat|lunge|hip thrust|step-up/i],
  [/ankle|foot/i, /run|jog|jump|calf raise|stair|skater hop/i],
];

export function conflictsWithLimitation(exercise: ExerciseLike, limitation: string) {
  const description = limitation.trim();
  if (!description) return false;
  const movement = `${exercise.name} ${exercise.focus} ${exercise.muscleGroup ?? ""}`;
  return painConflicts.some(([reportedArea, conflictingMovement]) =>
    reportedArea.test(description) && conflictingMovement.test(movement),
  );
}

export function personaliseExercises<T extends ExerciseLike>(
  exercises: T[],
  history: WorkoutLike[],
  limitation: string,
  now = new Date(),
): T[] {
  const cutoff = now.getTime() - 72 * 60 * 60 * 1000;
  const recentlyCompleted = new Set(history.flatMap((workout) => {
    const completedAt = new Date(workout.completedAt).getTime();
    if (!Number.isFinite(completedAt) || completedAt < cutoff || completedAt > now.getTime()) return [];
    return workout.exercises
      .filter((exercise) => exercise.completedSets.length > 0)
      .map((exercise) => exercise.name);
  }));

  return exercises
    .map((exercise, index) => ({ exercise, index }))
    .sort((a, b) => Number(recentlyCompleted.has(a.exercise.name)) - Number(recentlyCompleted.has(b.exercise.name)) || a.index - b.index)
    .map(({ exercise }) => exercise);
}

export function durationForReadiness(requestedMinutes: number, readiness: Readiness) {
  const safe = Math.max(10, Math.min(180, Math.round(requestedMinutes || 30)));
  if (readiness !== "Low") return safe;
  return Math.max(10, Math.min(30, Math.round((safe * 0.67) / 5) * 5));
}

export function setsForReadiness(baseSets: number, readiness: Readiness) {
  const safe = Math.max(1, Math.round(baseSets));
  return readiness === "Low" ? Math.max(1, safe - 1) : safe;
}

export function completedSetCount(logs: unknown[][]) {
  return logs.reduce((total, sets) => total + sets.length, 0);
}

export function protectCompletedSets<T, TSet>(exercises: T[], logs: TSet[][]): Array<T & { completedSets: TSet[] }> {
  return exercises.map((exercise, index) => ({ ...exercise, completedSets: logs[index] ?? [] }));
}
