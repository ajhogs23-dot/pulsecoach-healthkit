import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (userKey: string) => `pulsecoach.exerciseFavorites.${userKey}`;

export async function loadExerciseFavorites(userKey: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function toggleExerciseFavorite(userKey: string, exerciseId: string) {
  const current = await loadExerciseFavorites(userKey);
  const next = current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId];
  await AsyncStorage.setItem(key(userKey), JSON.stringify(next));
  return next;
}
