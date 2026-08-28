import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProfileGoal = "Lose fat" | "Build strength" | "Improve fitness" | "Maintain health";
export type ActivityLevel = "Sedentary" | "Lightly active" | "Moderately active" | "Very active";
export type EstimateSex = "Male" | "Female";

export type ProfilePreferences = {
  name: string;
  goal: ProfileGoal;
  foodPreference: "No preference" | "Vegetarian" | "High-protein";
  trainingSetup: "Dumbbells" | "Full gym" | "Bodyweight";
  coachingStyle: "Encouraging" | "Direct" | "Minimal";
  sexForEstimate?: EstimateSex;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel: ActivityLevel;
  calorieTarget?: number;
};

export type CalorieEstimate = {
  restingCalories: number;
  maintenanceCalories: number;
  recommendedCalories: number;
};

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  name: "Andy",
  goal: "Build strength",
  foodPreference: "No preference",
  trainingSetup: "Full gym",
  coachingStyle: "Encouraging",
  activityLevel: "Moderately active",
};

const storageKey = (userKey: string) => `pulsecoach.profile.${userKey}`;

export async function loadProfilePreferences(userKey: string): Promise<ProfilePreferences> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return DEFAULT_PROFILE_PREFERENCES;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PROFILE_PREFERENCES;
  }
}

export async function saveProfilePreferences(userKey: string, profile: ProfilePreferences) {
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(profile));
}

const activityFactors: Record<ActivityLevel, number> = {
  Sedentary: 1.2,
  "Lightly active": 1.375,
  "Moderately active": 1.55,
  "Very active": 1.725,
};

const goalFactors: Record<ProfileGoal, number> = {
  "Lose fat": 0.85,
  "Build strength": 1.1,
  "Improve fitness": 1,
  "Maintain health": 1,
};

export function calculateCalorieEstimate(profile: ProfilePreferences): CalorieEstimate | undefined {
  const { sexForEstimate, age, heightCm, weightKg } = profile;
  if (!sexForEstimate || !age || !heightCm || !weightKg || age <= 0 || heightCm <= 0 || weightKg <= 0) return undefined;

  const sexConstant = sexForEstimate === "Male" ? 5 : -161;
  const restingCalories = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
  const maintenanceCalories = restingCalories * activityFactors[profile.activityLevel];
  const adjusted = maintenanceCalories * goalFactors[profile.goal];
  const recommendedCalories = profile.goal === "Lose fat" ? Math.max(restingCalories, adjusted) : adjusted;

  return {
    restingCalories: Math.round(restingCalories),
    maintenanceCalories: Math.round(maintenanceCalories),
    recommendedCalories: Math.round(recommendedCalories / 10) * 10,
  };
}
