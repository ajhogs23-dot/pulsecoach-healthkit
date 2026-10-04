export type GymSearchOptions = { latitude?: number; longitude?: number; pageToken?: string; signal?: AbortSignal };
export type GymSearchSource = "google-places" | "openstreetmap" | "directory";
export type ExternalGymSearchResult = { provider: GymSearchSource; placeId: string; name: string; formattedAddress: string; suburb?: string; state?: string; postcode?: string; country?: string; latitude?: number; longitude?: number; primaryType?: string; businessStatus?: string; distanceKm?: number };
export type GymSearchStatus = "configured" | "unconfigured" | "offline" | "error";
export type GymSearchProvider = { search(query: string, options?: GymSearchOptions): Promise<{ results: ExternalGymSearchResult[]; nextPageToken?: string; status?: GymSearchStatus }> };

// Public directory listing; this does not establish or seed equipment inventory.
// https://www.gleninnesexaminer.com.au/local-business/services/glen%20innes-nsw/kings-gym-and-fitness-61417188896
export const KNOWN_GYMS: ExternalGymSearchResult[] = [{
  provider: "directory", placeId: "kings-gym-fitness-glen-innes", name: "Kings Gym & Fitness",
  formattedAddress: "211 Grey St, Glen Innes NSW 2370, Australia", suburb: "Glen Innes", state: "NSW", postcode: "2370", country: "Australia",
}];
export function findKnownGyms(query: string) {
  const words = query.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return words.length ? KNOWN_GYMS.filter(gym => {
    const text = `${gym.name} ${gym.formattedAddress}`.toLowerCase();
    return words.every(word => text.includes(word));
  }) : [];
}
