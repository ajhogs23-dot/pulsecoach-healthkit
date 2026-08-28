export type WorkoutFocus = "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Arms" | "Legs" | "Glutes" | "Core" | "Full body" | "Cardio" | "Run" | "Walk" | "Cycle" | "Mobility/recovery" | "Custom workout";

const exercises: Record<string, string[]> = {
  Chest: ["Dumbbell bench press", "Incline push-up", "Cable fly"], Back: ["Lat pulldown", "Seated row", "Single-arm dumbbell row"], Shoulders: ["Seated shoulder press", "Lateral raise", "Face pull"], Biceps: ["Dumbbell curl", "Hammer curl", "Cable curl"], Triceps: ["Rope pressdown", "Overhead extension", "Close-grip push-up"], Arms: ["Dumbbell curl", "Rope pressdown", "Hammer curl"], Legs: ["Goblet squat", "Romanian deadlift", "Leg press"], Glutes: ["Hip thrust", "Step-up", "Cable kickback"], Core: ["Dead bug", "Pallof press", "Plank"], "Full body": ["Goblet squat", "Dumbbell row", "Farmer carry"], Cardio: ["Bike intervals", "Incline walk", "Rowing intervals"], Run: ["Easy run", "Tempo intervals", "Cool-down walk"], Walk: ["Brisk walk", "Incline walk", "Cool-down walk"], Cycle: ["Easy spin", "Tempo ride", "Cadence intervals"], "Mobility/recovery": ["Cat-cow", "90/90 hip flow", "Thoracic rotation"], "Custom workout": ["User-selected movement"]
};

export function buildFocusPlan(focus: WorkoutFocus, minutes: number, limitation = "") {
  const safeMinutes = Math.max(10, Math.min(180, Math.round(minutes || 30)));
  const lowerLimit = limitation.toLowerCase();
  const selected = (exercises[focus] ?? exercises["Full body"]).filter((exercise) => !((lowerLimit.includes("shoulder") && /press|lateral|fly/i.test(exercise)) || (lowerLimit.includes("knee") && /squat|step|leg press/i.test(exercise))));
  return { focus, minutes: safeMinutes, exercises: selected.length ? selected : ["Mobility check-in"], changedForLimitation: selected.length !== (exercises[focus] ?? exercises["Full body"]).length };
}

export function canReplaceCompletedWorkout(completedSets: number) { return completedSets > 0; }
