import type { ExternalGymSearchResult, GymSearchProvider } from "../lib/gym-directory";

type PlacesResponse = { places?: Array<{ id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number }; primaryType?: string; businessStatus?: string }>; nextPageToken?: string };

function parseAddress(address: string) {
  const postcode = address.match(/\b(\d{4})\b/)?.[1];
  const parts = address.split(",").map((part) => part.trim());
  return { postcode, suburb: parts.length > 2 ? parts[parts.length - 3] : parts[0], state: parts.find((part) => /\b(NSW|QLD|VIC|WA|SA|TAS|NT|ACT)\b/i.test(part))?.match(/NSW|QLD|VIC|WA|SA|TAS|NT|ACT/i)?.[0] };
}

export class GooglePlacesGymSearchProvider implements GymSearchProvider {
  constructor(private readonly apiKey: string | undefined = process.env.GOOGLE_PLACES_API_KEY) {}
  async search(query: string, options: { latitude?: number; longitude?: number; pageToken?: string; signal?: AbortSignal } = {}) {
    if (!this.apiKey) return { results: [], status: "unconfigured" as const };
    const locationSuffix = /\btamworth\b/i.test(query) ? ", NSW, Australia" : /\bgold coast\b/i.test(query) ? ", QLD, Australia" : ", Australia";
    const body: Record<string, unknown> = { textQuery: `${query}${locationSuffix}`, pageSize: 20, languageCode: "en-AU", regionCode: "AU" };
    if (options.pageToken) body.pageToken = options.pageToken;
    if (options.latitude !== undefined && options.longitude !== undefined && !/^\d{4}$/.test(query.trim())) body.locationBias = { circle: { center: { latitude: options.latitude, longitude: options.longitude }, radius: 25000 } };
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.businessStatus,nextPageToken" }, body: JSON.stringify(body), signal: options.signal });
    if (!response.ok) return { results: [], status: "error" as const };
    const payload = await response.json() as PlacesResponse;
    return { results: (payload.places ?? []).filter((place): place is Required<Pick<typeof place, "id">> & typeof place => Boolean(place.id && place.displayName?.text && place.formattedAddress)).map((place) => { const address = parseAddress(place.formattedAddress!); return { provider: "google-places" as const, placeId: place.id!, name: place.displayName!.text!, formattedAddress: place.formattedAddress!, suburb: address.suburb, state: address.state, postcode: address.postcode, country: "Australia", latitude: place.location?.latitude, longitude: place.location?.longitude, primaryType: place.primaryType, businessStatus: place.businessStatus }; }), nextPageToken: payload.nextPageToken, status: "configured" as const };
  }
}
