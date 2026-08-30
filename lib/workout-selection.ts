export type WorkoutFocus = "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Arms" | "Legs" | "Glutes" | "Core" | "Full body" | "Cardio" | "Run" | "Walk" | "Cycle" | "Mobility/recovery" | "Custom workout";
export type WorkoutReadiness = "Low" | "Okay" | "Ready";
export type PainArea = "None" | "Shoulder" | "Elbow" | "Wrist/hand" | "Neck" | "Back" | "Hip" | "Knee" | "Ankle/foot" | "Other";

const painAreaLimitations: Record<Exclude<PainArea, "Other">, string> = {
  None: "",
  Shoulder: "shoulder pain",
  Elbow: "elbow pain",
  "Wrist/hand": "wrist or hand pain",
  Neck: "neck pain",
  Back: "back pain",
  Hip: "hip pain",
  Knee: "knee pain",
  "Ankle/foot": "ankle or foot pain",
};

export function limitationForPainArea(area: PainArea, otherLimitation = "") {
  return area === "Other" ? otherLimitation.trim() : painAreaLimitations[area];
}

const exercises: Record<string, string[]> = {
  Chest: ["Dumbbell bench press", "Incline push-up", "Cable fly"], Back: ["Lat pulldown", "Seated row", "Single-arm dumbbell row"], Shoulders: ["Seated shoulder press", "Lateral raise", "Face pull"], Biceps: ["Dumbbell curl", "Hammer curl", "Cable curl"], Triceps: ["Rope pressdown", "Overhead extension", "Close-grip push-up"], Arms: ["Dumbbell curl", "Rope pressdown", "Hammer curl"], Legs: ["Goblet squat", "Romanian deadlift", "Leg press"], Glutes: ["Hip thrust", "Step-up", "Cable kickback"], Core: ["Dead bug", "Pallof press", "Plank"], "Full body": ["Goblet squat", "Dumbbell row", "Farmer carry"], Cardio: ["Bike intervals", "Incline walk", "Rowing intervals"], Run: ["Easy run", "Tempo intervals", "Cool-down walk"], Walk: ["Brisk walk", "Incline walk", "Cool-down walk"], Cycle: ["Easy spin", "Tempo ride", "Cadence intervals"], "Mobility/recovery": ["Cat-cow", "90/90 hip flow", "Thoracic rotation"], "Custom workout": ["User-selected movement"]
};

const shoulderLoadingPattern = /push[ -]?up|press|fly|dip|pull[ -]?up|pulldown|pull[ -]?over|row|raise|wall walk|battle rope|boxing|burpee|mountain climber|plank|overhead|farmer carry/i;
const kneeLoadingPattern = /squat|lunge|step[ -]?up|leg press|hack squat|jump|stair|sled push/i;

export function isExerciseContraindicated(exercise: string, limitation = "", muscleGroup = "") {
  const lowerLimit = limitation.toLowerCase();
  if (lowerLimit.includes("shoulder") && (muscleGroup.toLowerCase() === "shoulders" || shoulderLoadingPattern.test(exercise))) return true;
  if (lowerLimit.includes("knee") && kneeLoadingPattern.test(exercise)) return true;
  return false;
}

export function contraindicationWarning(limitation = "") {
  const lowerLimit = limitation.toLowerCase();
  if (lowerLimit.includes("shoulder")) return "Avoid today — may aggravate your shoulder.";
  if (lowerLimit.includes("knee")) return "Avoid today — may aggravate your knee.";
  return "Avoid today — may aggravate your reported pain.";
}

export function contraindicationConfirmation(exercise: string, limitation = "") {
  const lowerLimit = limitation.toLowerCase();
  const reportedPain = lowerLimit.includes("shoulder") ? "shoulder pain" : lowerLimit.includes("knee") ? "knee pain" : "pain or a limitation";
  return `You reported ${reportedPain}. ${exercise} may aggravate it. Stop if it hurts.`;
}

export function applyReadinessVolume<T>(items: T[], readiness: WorkoutReadiness) {
  if (readiness === "Ready" || items.length <= 1) return items;
  const factor = readiness === "Low" ? 0.6 : 0.85;
  return items.slice(0, Math.max(1, Math.ceil(items.length * factor)));
}

export function buildFocusPlan(focus: WorkoutFocus, minutes: number, limitation = "", readiness: WorkoutReadiness = "Ready") {
  const safeMinutes = Math.max(10, Math.min(180, Math.round(minutes || 30)));
  const candidates = exercises[focus] ?? exercises["Full body"];
  const painSafe = candidates.filter((exercise) => !isExerciseContraindicated(exercise, limitation));
  const readinessAdjusted = applyReadinessVolume(painSafe, readiness);
  return {
    focus,
    minutes: safeMinutes,
    exercises: readinessAdjusted.length ? readinessAdjusted : ["Mobility check-in"],
    changedForLimitation: painSafe.length !== candidates.length,
    limitationAcknowledged: limitation.trim().length > 0,
    readiness,
    volumeAdjustedForReadiness: readinessAdjusted.length !== painSafe.length,
  };
}

export function canReplaceCompletedWorkout(completedSets: number) { return completedSets > 0; }
