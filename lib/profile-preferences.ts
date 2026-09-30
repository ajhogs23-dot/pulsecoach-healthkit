import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTRPCClient } from "./trpc";
import { DEFAULT_PROFILE_PREFERENCES, type ProfilePreferences } from "../shared/personal-details";
export * from "../shared/personal-details";

const profileCacheKey = (userKey: string) => `pulsecoach.profile.cache.${userKey}`;

/** Reads only an account-scoped cache for immediate first paint. */
export async function loadCachedProfilePreferences(userKey: string): Promise<ProfilePreferences | undefined> {
  if (!userKey || userKey === "local-user") return undefined;
  try {
    const raw = await AsyncStorage.getItem(profileCacheKey(userKey));
    return raw ? { ...DEFAULT_PROFILE_PREFERENCES, ...JSON.parse(raw) } : undefined;
  } catch { return undefined; }
}

// The API derives ownership from the session, never from a submitted user ID.
export async function loadProfilePreferences(userKey: string): Promise<ProfilePreferences> {
  if (!userKey || userKey === "local-user") return { ...DEFAULT_PROFILE_PREFERENCES };
  const client = createTRPCClient();
  let owner;
  try { owner = await client.auth.me.query(); } catch (error) { throw procedureError("auth.me", error); }
  if (!owner || (owner.openId !== userKey && String(owner.id) !== userKey)) throw new Error("Sign in to access your personal details.");
  let current;
  try { current = await client.profile.personalDetails.query(); } catch (error) { throw procedureError("profile.personalDetails", error); }
  // Only import an explicitly owned legacy record. Unowned local-user data stays untouched.
  const raw = await AsyncStorage.getItem(`pulsecoach.profile.${userKey}`);
  const currentGymId = !current.migrated ? await AsyncStorage.getItem(`pulsecoach.current-gym.${userKey}`) : null;
  const homeGymId = !current.migrated ? await AsyncStorage.getItem(`pulsecoach.home-gym.${userKey}`) : null;
  if ((raw || currentGymId || homeGymId) && !current.migrated) {
    const legacy = { ...(raw ? JSON.parse(raw) : {}), ...(currentGymId ? { currentGymId } : {}), ...(homeGymId ? { homeGymId } : {}) };
    try { return await client.profile.importPersonalDetails.mutate(legacy); } catch (error) { throw procedureError("profile.importPersonalDetails", error); }
  }
  await AsyncStorage.setItem(profileCacheKey(userKey), JSON.stringify(current.details));
  return current.details;
}

export async function saveProfilePreferences(userKey: string, profile: ProfilePreferences) {
  const client = createTRPCClient();
  let owner;
  try { owner = await client.auth.me.query(); } catch (error) { throw procedureError("auth.me", error); }
  if (!owner || (owner.openId !== userKey && String(owner.id) !== userKey)) throw new Error("Sign in to save your personal details.");
  let saved;
  try { saved = await client.profile.savePersonalDetails.mutate(profile); } catch (error) { throw procedureError("profile.savePersonalDetails", error); }
  await AsyncStorage.setItem(profileCacheKey(userKey), JSON.stringify(saved));
  return saved;
}

function procedureError(path: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/no procedure found|procedure not found/i.test(message)) {
    return new Error(`The connected PulseCoach server is missing procedure ${path}. Update the API deployment configured by EXPO_PUBLIC_API_BASE_URL, then retry.`);
  }
  return error instanceof Error ? error : new Error(message);
}
