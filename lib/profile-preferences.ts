import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProfilePreferences = {
  name: string;
  goal: "Build strength" | "Improve fitness" | "Maintain health";
  foodPreference: "No preference" | "Vegetarian" | "High-protein";
  trainingSetup: "Dumbbells" | "Full gym" | "Bodyweight";
  coachingStyle: "Encouraging" | "Direct" | "Minimal";
  calorieTarget?: number;
};

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  name: "Andy",
  goal: "Build strength",
  foodPreference: "No preference",
  trainingSetup: "Full gym",
  coachingStyle: "Encouraging",
};

const storageKey = (userKey: string) => `pulsecoach.profile.${userKey}`;

export async function loadProfilePreferences(userKey: string): Promise<ProfilePreferences> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return DEFAULT_PROFILE_PREFERENCES;
  try {
    return { ...DEFAULT_PROFILE_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE_PREFERENCES;
  }
}

export async function saveProfilePreferences(userKey: string, profile: ProfilePreferences) {
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(profile));
}
