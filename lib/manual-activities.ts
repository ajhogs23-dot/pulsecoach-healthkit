import { loadPersistentUserData, savePersistentUserData } from "@/lib/persistent-user-data";

export type ManualActivityType = "Strength" | "Cardio" | "Walk";

export type ManualActivity = {
  id: string;
  type: ManualActivityType;
  minutes: number;
  calories?: number;
  createdAt: string;
};

const storageKey = (userKey: string) => `pulsecoach.manualActivities.${userKey}`;

export async function loadManualActivities(userKey: string): Promise<ManualActivity[]> {
  return loadPersistentUserData<ManualActivity[]>("manual-activities", storageKey(userKey), []);
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
  await savePersistentUserData("manual-activities", storageKey(userKey), next);
  return next;
}

export async function removeManualActivity(userKey: string, activityId: string): Promise<ManualActivity[]> {
  const current = await loadManualActivities(userKey);
  const next = current.filter((activity) => activity.id !== activityId);
  await savePersistentUserData("manual-activities", storageKey(userKey), next);
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
