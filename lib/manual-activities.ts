import AsyncStorage from "@react-native-async-storage/async-storage";

export type ManualActivityType = "Strength" | "Cardio" | "Run" | "Walk" | "Cycle" | "Other activity";

export type ManualActivity = {
  id: string;
  type: ManualActivityType;
  minutes: number;
  calories?: number;
  createdAt: string;
};

const storageKey = (userKey: string) => `pulsecoach.manualActivities.${userKey}`;

export async function loadManualActivities(userKey: string): Promise<ManualActivity[]> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addManualActivity(
  userKey: string,
  activity: Omit<ManualActivity, "id" | "createdAt">,
): Promise<ManualActivity[]> {
  const current = await loadManualActivities(userKey);
  const createdAt = new Date().toISOString();
  const next = [
    ...current,
    {
      ...activity,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
    },
  ];
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export async function removeManualActivity(userKey: string, activityId: string): Promise<ManualActivity[]> {
  const current = await loadManualActivities(userKey);
  const next = current.filter((activity) => activity.id !== activityId);
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export function todayManualActivities(activities: ManualActivity[], reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return activities.filter((activity) => {
    const createdAt = new Date(activity.createdAt);
    return createdAt >= start && createdAt < end;
  });
}

export function summariseManualActivities(activities: ManualActivity[], reference = new Date()) {
  const today = todayManualActivities(activities, reference);
  return {
    entries: today,
    minutes: today.reduce((total, activity) => total + activity.minutes, 0),
    calories: today.reduce((total, activity) => total + (activity.calories ?? 0), 0),
  };
}
