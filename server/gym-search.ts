import { randomUUID } from "node:crypto";
import { mergeExternalGymResults, type ExternalGymSearchResult, type GymSearchOptions, type GymSearchProvider } from "../shared/gym-search-types";

type Place = { id?: string; displayName?: { text?: string }; formattedAddress?: string; addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>; location?: { latitude?: number; longitude?: number }; primaryType?: string; types?: string[]; businessStatus?: string };
type PlacesResponse = { places?: Place[]; nextPageToken?: string };
type Branch = { textQuery: string; pageToken?: string };
type Cursor = { until: number; identity: string; branches: Branch[] };
const cursors = new Map<string, Cursor>();
const fitnessTypes = new Set(["gym", "fitness_center", "yoga_studio", "pilates_studio"]);
const businessWords = /\b(gym|gyms|fitness|cross\s?fit|yoga|pilates|studio|studios|f45|sportune|pcyc)\b/i;
const identity = (query: string, options: GymSearchOptions) => JSON.stringify([query.trim().toLowerCase(), options.latitude, options.longitude]);

function mapPlace(place: Place): ExternalGymSearchResult | undefined {
  if (!place.id || !place.displayName?.text || !place.formattedAddress) return;
  const types = [place.primaryType, ...(place.types ?? [])].filter(Boolean) as string[];
  const fitnessSportsCentre = types.some(type => ["sports_activity_location", "sports_club", "sports_complex"].includes(type)) && /\b(gym|fitness|cross\s?fit|yoga|pilates|training facility|sportune|pcyc)\b/i.test(place.displayName.text);
  if (types.length && !fitnessSportsCentre && !types.some(type => fitnessTypes.has(type))) return;
  const component = (type: string) => place.addressComponents?.find(item => item.types?.includes(type));
  if (component("country")?.shortText && component("country")!.shortText !== "AU") return;
  const address = place.formattedAddress;
  const postcode = component("postal_code")?.longText ?? address.match(/\b(\d{4})\b/)?.[1];
  const state = component("administrative_area_level_1")?.shortText ?? address.match(/\b(NSW|QLD|VIC|WA|SA|TAS|NT|ACT)\b/i)?.[0];
  if (!component("country")?.shortText && !state && !/Australia\s*$/i.test(address)) return;
  const suburb = component("locality")?.longText ?? address.match(/,\s*([^,]+?)\s+(?:NSW|QLD|VIC|WA|SA|TAS|NT|ACT)\s+\d{4}\b/i)?.[1];
  return { provider: "google-places", placeId: place.id, name: place.displayName.text, formattedAddress: address, suburb, state, postcode, country: "Australia", latitude: place.location?.latitude, longitude: place.location?.longitude, primaryType: place.primaryType, businessStatus: place.businessStatus };
}

export class GooglePlacesGymSearchProvider implements GymSearchProvider {
  constructor(private readonly apiKey: string | undefined = process.env.GOOGLE_PLACES_API_KEY) {}
  async search(query: string, options: GymSearchOptions = {}) {
    if (!this.apiKey) return { results: [], status: "unconfigured" as const };
    const suffix = /\btamworth\b/i.test(query) ? ", NSW, Australia" : /\bgold coast\b/i.test(query) ? ", QLD, Australia" : ", Australia";
    const key = identity(query, options);
    const cursor = options.pageToken ? cursors.get(options.pageToken) : undefined;
    if (options.pageToken && (!cursor || cursor.until <= Date.now() || cursor.identity !== key)) return { results: [], status: "error" as const };
    const nearby = /^gyms?$/i.test(query.trim()) && options.latitude !== undefined && options.longitude !== undefined;
    const location = nearby ? "nearby" : `in ${query}`;
    const branches: Branch[] = cursor?.branches ?? (businessWords.test(query) && !nearby ? [{ textQuery: `${query}${suffix}` }] : [
      { textQuery: `gyms and fitness centres ${location}${suffix}` },
      { textQuery: `yoga studios ${location}${suffix}` },
      { textQuery: `Pilates studios ${location}${suffix}` },
    ]);
    const pages = await Promise.allSettled(branches.map(async branch => {
      const body: Record<string, unknown> = { textQuery: branch.textQuery, pageSize: 20, languageCode: "en-AU", regionCode: "AU" };
      if (branch.pageToken) body.pageToken = branch.pageToken;
      if (options.latitude !== undefined && options.longitude !== undefined && !/^\d{4}$/.test(query.trim())) body.locationBias = { circle: { center: { latitude: options.latitude, longitude: options.longitude }, radius: 25000 } };
      const timeout = AbortSignal.timeout(7000);
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey!, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.primaryType,places.types,places.businessStatus,nextPageToken" },
        body: JSON.stringify(body), signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      });
      if (!response.ok) throw new Error("Places search unavailable");
      return { branch, payload: await response.json() as PlacesResponse };
    }));
    const successful = pages.flatMap(page => page.status === "fulfilled" ? [page.value] : []);
    if (!successful.length) return { results: [], status: "error" as const };
    const results = mergeExternalGymResults(...successful.map(page => (page.payload.places ?? []).map(mapPlace).filter((place): place is ExternalGymSearchResult => Boolean(place))));
    const remaining: Branch[] = successful.flatMap(page => page.payload.nextPageToken ? [{ textQuery: page.branch.textQuery, pageToken: page.payload.nextPageToken }] : []);
    // Preserve failed branches for an explicit retry, without losing successful results.
    pages.forEach((page, index) => { if (page.status === "rejected") remaining.push(branches[index]); });
    let nextPageToken: string | undefined;
    if (remaining.length) {
      for (const [token, value] of cursors) if (value.until <= Date.now()) cursors.delete(token);
      if (cursors.size >= 128) cursors.delete(cursors.keys().next().value!);
      nextPageToken = `gyms:${randomUUID()}`;
      cursors.set(nextPageToken, { until: Date.now() + 300000, identity: key, branches: remaining });
    }
    return { results, nextPageToken, status: "configured" as const };
  }
}
