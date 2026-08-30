import AsyncStorage from "@react-native-async-storage/async-storage";

export type MovementLimitation = {
  id: string;
  area: string;
  notes: string;
  createdAt: string;
};

const storageKey = (userKey: string) => `pulsecoach.limitations.${userKey}`;

export async function loadMovementLimitations(userKey: string): Promise<MovementLimitation[]> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveMovementLimitation(
  userKey: string,
  area: string,
  notes: string,
): Promise<MovementLimitation[]> {
  const current = await loadMovementLimitations(userKey);
  const limitation: MovementLimitation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    area: area.trim(),
    notes: notes.trim(),
    createdAt: new Date().toISOString(),
  };
  const next = [...current, limitation];
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export async function deleteMovementLimitation(userKey: string, id: string): Promise<MovementLimitation[]> {
  const current = await loadMovementLimitations(userKey);
  const next = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export function limitationText(limitations: MovementLimitation[]) {
  return limitations.map((item) => `${item.area} ${item.notes}`.trim()).join("; ");
}
