import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProfilePreferences } from "@/lib/profile-preferences";
import type { MuscleGroup } from "@/lib/exercise-library";

export type WorkoutExercise = {
  name: string;
  focus: string;
  sets: number;
  repTarget: string;
  tracking?: "reps" | "time";
};

export type ActiveWorkoutPlan = {
  title: string;
  focus: MuscleGroup;
  durationMinutes: number;
  exercises: WorkoutExercise[];
};

export type WorkoutSetLog = {
  reps?: number;
  minutes?: number;
  weightKg?: number;
};

export type CompletedWorkout = {
  id: string;
  title: string;
  completedAt: string;
  durationMinutes: number;
  exercises: Array<WorkoutExercise & { completedSets: WorkoutSetLog[] }>;
};

const storageKey = (userKey: string) => `pulsecoach.workouts.${userKey}`;
const activePlanKey = (userKey: string) => `pulsecoach.activeWorkout.${userKey}`;

export function getWorkoutPlan(profile: ProfilePreferences): { title: string; durationMinutes: number; exercises: WorkoutExercise[] } {
  const build = profile.goal === "Build strength";
  const sets = build ? 3 : profile.goal === "Maintain health" ? 2 : 3;
  const repTarget = build ? "8–10" : "10–12";

  const byEquipment: Record<ProfilePreferences["trainingSetup"], Array<Omit<WorkoutExercise, "sets" | "repTarget">>> = {
    Dumbbells: [
      { name: "Dumbbell goblet squat", focus: "Legs + core" },
      { name: "Single-arm dumbbell row", focus: "Back" },
      { name: "Dumbbell floor press", focus: "Chest + triceps" },
      { name: "Dumbbell Romanian deadlift", focus: "Hamstrings + glutes" },
    ],
    "Full gym": [
      { name: "Leg press", focus: "Legs" },
      { name: "Chest press", focus: "Chest + triceps" },
      { name: "Lat pulldown", focus: "Back + biceps" },
      { name: "Romanian deadlift", focus: "Hamstrings + glutes" },
    ],
    Bodyweight: [
      { name: "Bodyweight squat", focus: "Legs + core" },
      { name: "Push-up", focus: "Chest + triceps" },
      { name: "Glute bridge", focus: "Glutes + hamstrings" },
      { name: "Dead bug", focus: "Core" },
    ],
  };

  return {
    title: build ? "Full-body strength" : profile.goal === "Lose fat" ? "Full-body conditioning" : "Full-body fitness",
    durationMinutes: sets === 2 ? 25 : 35,
    exercises: byEquipment[profile.trainingSetup].map((exercise) => ({ ...exercise, sets, repTarget })),
  };
}

export async function saveActiveWorkoutPlan(userKey: string, plan: ActiveWorkoutPlan) {
  await AsyncStorage.setItem(activePlanKey(userKey), JSON.stringify(plan));
}

export async function loadActiveWorkoutPlan(userKey: string): Promise<ActiveWorkoutPlan | undefined> {
  const raw = await AsyncStorage.getItem(activePlanKey(userKey));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ActiveWorkoutPlan;
  } catch {
    return undefined;
  }
}

export async function loadCompletedWorkouts(userKey: string): Promise<CompletedWorkout[]> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCompletedWorkout(userKey: string, workout: Omit<CompletedWorkout, "id" | "completedAt">) {
  const current = await loadCompletedWorkouts(userKey);
  const completed: CompletedWorkout = {
    ...workout,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt: new Date().toISOString(),
  };
  const next = [...current, completed];
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export function todayCompletedWorkouts(workouts: CompletedWorkout[], reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return workouts.filter((workout) => {
    const completedAt = new Date(workout.completedAt);
    return completedAt >= start && completedAt < end;
  });
}
