import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTRPCClient } from "@/lib/trpc";

const api = createTRPCClient();

function parseLocal<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Loads data owned by the signed-in user. Existing device-only data is uploaded
 * once when the server has no copy; AsyncStorage remains the offline cache.
 */
export async function loadPersistentUserData<T>(
  namespace: string,
  localStorageKey: string,
  fallback: T,
): Promise<T> {
  const localRaw = await AsyncStorage.getItem(localStorageKey);
  const local = parseLocal(localRaw, fallback);
  try {
    const remote = await api.userData.get.query({ namespace });
    if (remote !== null && remote !== undefined) {
      await AsyncStorage.setItem(localStorageKey, JSON.stringify(remote));
      return remote as T;
    }
    if (localRaw) await api.userData.set.mutate({ namespace, payload: local });
  } catch {
    // Offline and signed-out reads continue from the device cache.
  }
  return local;
}

export async function savePersistentUserData<T>(
  namespace: string,
  localStorageKey: string,
  value: T,
): Promise<void> {
  await AsyncStorage.setItem(localStorageKey, JSON.stringify(value));
  try {
    await api.userData.set.mutate({ namespace, payload: value });
  } catch {
    // The cached write is migrated after connectivity/authentication returns.
  }
}

export async function removePersistentUserData(
  namespace: string,
  localStorageKey: string,
): Promise<void> {
  await AsyncStorage.removeItem(localStorageKey);
  try {
    await api.userData.remove.mutate({ namespace });
  } catch {
    // Local removal still succeeds while offline.
  }
}
