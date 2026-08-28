import AsyncStorage from "@react-native-async-storage/async-storage";

export type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export type FoodNutrition = {
  calories: number;
  protein: number;
  carbohydrates: number;
  sugars: number;
  fat: number;
  fibre: number;
  sodium: number;
};

export type FoodLogEntry = {
  id: string;
  name: string;
  meal: MealName;
  servings: number;
  nutrition: FoodNutrition;
  createdAt: string;
};

const storageKey = (userKey: string) => `pulsecoach.foodLog.${userKey}`;

export async function loadFoodLog(userKey: string): Promise<FoodLogEntry[]> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addFoodLog(
  userKey: string,
  entry: Omit<FoodLogEntry, "id" | "createdAt">,
): Promise<FoodLogEntry[]> {
  const current = await loadFoodLog(userKey);
  const next = [...current, {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }];
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export async function removeFoodLog(userKey: string, entryId: string): Promise<FoodLogEntry[]> {
  const current = await loadFoodLog(userKey);
  const next = current.filter((entry) => entry.id !== entryId);
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export function todayFoodLog(entries: FoodLogEntry[], reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return entries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= start && createdAt < end;
  });
}

export function summariseFoodLog(entries: FoodLogEntry[], reference = new Date()): FoodNutrition {
  const today = todayFoodLog(entries, reference);
  return today.reduce<FoodNutrition>((total, entry) => ({
    calories: total.calories + entry.nutrition.calories * entry.servings,
    protein: total.protein + entry.nutrition.protein * entry.servings,
    carbohydrates: total.carbohydrates + entry.nutrition.carbohydrates * entry.servings,
    sugars: total.sugars + entry.nutrition.sugars * entry.servings,
    fat: total.fat + entry.nutrition.fat * entry.servings,
    fibre: total.fibre + entry.nutrition.fibre * entry.servings,
    sodium: total.sodium + entry.nutrition.sodium * entry.servings,
  }), { calories: 0, protein: 0, carbohydrates: 0, sugars: 0, fat: 0, fibre: 0, sodium: 0 });
}
