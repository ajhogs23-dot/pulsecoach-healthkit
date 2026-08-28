import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupplementProduct } from "@/lib/supplement-catalogue";

export type SavedSupplement = SupplementProduct & {
  addedAt: string;
  notes?: string;
};

const storageKey = (userKey: string) => `pulsecoach.supplements.${userKey}`;

export async function loadSupplements(userKey: string): Promise<SavedSupplement[]> {
  const raw = await AsyncStorage.getItem(storageKey(userKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addSupplement(userKey: string, product: SupplementProduct): Promise<SavedSupplement[]> {
  const current = await loadSupplements(userKey);
  if (current.some((item) => item.id === product.id)) return current;
  const next = [{ ...product, addedAt: new Date().toISOString() }, ...current];
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}

export async function removeSupplement(userKey: string, id: string): Promise<SavedSupplement[]> {
  const next = (await loadSupplements(userKey)).filter((item) => item.id !== id);
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(next));
  return next;
}
