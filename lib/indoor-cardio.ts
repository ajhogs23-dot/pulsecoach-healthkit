import AsyncStorage from "@react-native-async-storage/async-storage";

export type IndoorCardioType = "Treadmill run" | "Treadmill walk" | "Rowing machine" | "Indoor bike" | "Stair climber";

export type IndoorCardioEntry = {
  id: string;
  type: IndoorCardioType;
  completedAt: string;
  minutes: number;
  distanceKm?: number;
  calories?: number;
  heartRate?: number;
  incline?: number;
  maxIncline?: number;
  strokesPerMinute?: number;
  strokeCount?: number;
  split500mSeconds?: number;
  cadence?: number;
  resistance?: number;
  watts?: number;
  floors?: number;
  steps?: number;
  heightMetres?: number;
  speedLevel?: number;
  notes?: string;
};

const key = (userKey: string) => `pulsecoach.indoorCardio.${userKey}`;

export async function loadIndoorCardio(userKey: string): Promise<IndoorCardioEntry[]> {
  const raw = await AsyncStorage.getItem(key(userKey));
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export async function saveIndoorCardio(userKey: string, entry: Omit<IndoorCardioEntry, "id" | "completedAt">) {
  const current = await loadIndoorCardio(userKey);
  const saved: IndoorCardioEntry = { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, completedAt: new Date().toISOString() };
  await AsyncStorage.setItem(key(userKey), JSON.stringify([...current, saved]));
  return saved;
}

export function stairHeightMetres(floors?: number, steps?: number) {
  if (floors && floors > 0) return floors * 3;
  if (steps && steps > 0) return steps * 0.17;
  return 0;
}

export function heightComparison(metres: number) {
  if (metres <= 0) return "Add floors or steps to calculate your vertical climb.";
  const storeys = Math.max(1, Math.round(metres / 3));
  if (metres >= 134) return `${storeys} storeys — about ${(metres / 134).toFixed(1)} Sydney Harbour Bridge climbs.`;
  return `${storeys} storeys of vertical climbing.`;
}
