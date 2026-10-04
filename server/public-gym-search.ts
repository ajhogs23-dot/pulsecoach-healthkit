import { GooglePlacesGymSearchProvider } from "./gym-search";
import { findKnownGyms, type ExternalGymSearchResult, type GymSearchOptions, type GymSearchProvider } from "../shared/gym-search-types";

type Feature = { geometry?: { coordinates?: number[] }; properties?: Record<string, string | number> };
type SearchResult = Awaited<ReturnType<GymSearchProvider["search"]>> & { status: "configured" | "offline" };
const cache = new Map<string, { until: number; value: SearchResult }>();
const pending = new Map<string, Promise<SearchResult>>();
const states: Record<string, string> = { "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD", "Western Australia": "WA", "South Australia": "SA", "Tasmania": "TAS", "Northern Territory": "NT", "Australian Capital Territory": "ACT" };
async function photon(query: string, options: GymSearchOptions, nearby = false, gymsOnly = true): Promise<Feature[]> {
  const url = new URL(nearby ? "https://photon.komoot.io/reverse/" : "https://photon.komoot.io/api/");
  url.searchParams.set("limit", "15");
  url.searchParams.set("lang", "en");
  if (gymsOnly) url.searchParams.set("osm_tag", "leisure:fitness_centre");
  if (!nearby) { url.searchParams.set("q", query); url.searchParams.set("countrycode", "AU"); }
  if (options.latitude !== undefined && options.longitude !== undefined) {
    url.searchParams.set("lat", String(options.latitude)); url.searchParams.set("lon", String(options.longitude));
  }
  if (nearby) url.searchParams.set("radius", "25");
  const timeout = AbortSignal.timeout(7000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Gym search temporarily unavailable");
  const payload = await response.json() as { features?: Feature[] };
  return payload.features ?? [];
}
function mapGym(feature: Feature): ExternalGymSearchResult | undefined {
  const p = feature.properties, coordinates = feature.geometry?.coordinates;
  if (!p?.name || !p.osm_id || p.countrycode !== "AU" || p.osm_key !== "leisure" || p.osm_value !== "fitness_centre") return;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const suburb = String(p.district || p.city || p.locality || "");
  const state = states[String(p.state)] || String(p.state || "");
  return { provider: "openstreetmap", placeId: `${p.osm_type}:${p.osm_id}`, name: String(p.name),
    formattedAddress: [street, suburb, [state, p.postcode].filter(Boolean).join(" "), p.country].filter(Boolean).join(", "),
    suburb, state, postcode: String(p.postcode || ""), country: "Australia", longitude: coordinates?.[0], latitude: coordinates?.[1], primaryType: "fitness_centre" };
}
export class PublicGymSearchProvider implements GymSearchProvider {
  async search(query: string, options: GymSearchOptions = {}): Promise<SearchResult> {
    const key = JSON.stringify([query.trim().toLowerCase(), options.latitude, options.longitude, options.pageToken]);
    const cached = cache.get(key); if (cached && cached.until > Date.now()) return cached.value;
    if (pending.has(key)) return pending.get(key)!;
    const job = this.lookup(query, options).then(value => {
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(key, { until: Date.now() + (value.status === "configured" ? 300000 : 15000), value });
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, job); return job;
  }
  private async lookup(query: string, options: GymSearchOptions): Promise<SearchResult> {
    const known = findKnownGyms(query);
    try {
      const google = await new GooglePlacesGymSearchProvider().search(query, { ...options, signal: options.signal ?? AbortSignal.timeout(7000) });
      if (google.status === "configured" && google.results.length) return { ...google, results: [...known, ...google.results.filter(g => !known.some(k => k.name.toLowerCase() === g.name.toLowerCase() && k.postcode === g.postcode))] };
    } catch { /* Search public listings when Places is unavailable. */ }
    try {
      const nearby = /^gyms?$/i.test(query.trim()) && options.latitude !== undefined && options.longitude !== undefined;
      let features = await photon(query, options, nearby);
      // Town/suburb/postcode queries may be place names rather than gym names.
      if (!features.length && !known.length && !nearby) {
        const places = await photon(query, options, false, false);
        const place = places.find(p => ["city", "locality", "district", "county"].includes(String(p.properties?.type)));
        const coordinates = place?.geometry?.coordinates;
        if (coordinates) features = await photon(query, { ...options, latitude: coordinates[1], longitude: coordinates[0] }, true);
      }
      const results = features.map(mapGym).filter((g): g is ExternalGymSearchResult => Boolean(g));
      return { status: "configured", results: [...known, ...results.filter(g => !known.some(k => k.name.toLowerCase() === g.name.toLowerCase() && k.postcode === g.postcode))] };
    } catch { return { status: "offline", results: known }; }
  }
}
