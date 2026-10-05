import { GooglePlacesGymSearchProvider } from "./gym-search";
import { findKnownGyms, mergeExternalGymResults, type ExternalGymSearchResult, type GymSearchOptions, type GymSearchProvider } from "../shared/gym-search-types";

type Feature = { geometry?: { coordinates?: number[] }; properties?: Record<string, string | number> };
type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
type SearchResult = Awaited<ReturnType<GymSearchProvider["search"]>> & { status: "configured" | "offline" | "error" };
const cache = new Map<string, { until: number; value: SearchResult }>();
const pending = new Map<string, Promise<SearchResult>>();
const areaCache = new Map<string, { until: number; features: Feature[] }>();
const states: Record<string, string> = { "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD", "Western Australia": "WA", "South Australia": "SA", "Tasmania": "TAS", "Northern Territory": "NT", "Australian Capital Territory": "ACT" };
const fitnessSports = /^(fitness|crossfit|yoga|pilates|weightlifting|bodybuilding|gymnastics)$/i;
const tagFilters = ["leisure:fitness_centre", "leisure:sports_centre", "sport:fitness", "sport:crossfit", "sport:yoga", "sport:pilates"];
function signal(options: GymSearchOptions) { const timeout = AbortSignal.timeout(6500); return options.signal ? AbortSignal.any([options.signal, timeout]) : timeout; }
async function photon(query: string, options: GymSearchOptions, nearby = false, venues = true): Promise<Feature[]> {
  const url = new URL(nearby ? "https://photon.komoot.io/reverse/" : "https://photon.komoot.io/api/");
  url.searchParams.set("limit", "60"); url.searchParams.set("lang", "en");
  if (venues) tagFilters.forEach(tag => url.searchParams.append("osm_tag", tag));
  if (!nearby) { url.searchParams.set("q", query); url.searchParams.set("countrycode", "AU"); }
  if (options.latitude !== undefined && options.longitude !== undefined) { url.searchParams.set("lat", String(options.latitude)); url.searchParams.set("lon", String(options.longitude)); }
  if (nearby) url.searchParams.set("radius", "20");
  const response = await fetch(url, { signal: signal(options), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Gym search temporarily unavailable");
  const payload = await response.json() as { features?: Feature[] };
  return payload.features ?? [];
}
function validPoint(point?: number[]): point is [number, number] {
  return Boolean(point && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}
function mapGym(feature: Feature): ExternalGymSearchResult | undefined {
  const p = feature.properties, coordinates = feature.geometry?.coordinates;
  if (!p?.name || !p.osm_id || p.countrycode !== "AU") return;
  const venue = p.osm_key === "leisure" && ["fitness_centre", "fitness_station"].includes(String(p.osm_value));
  const fitnessCentre = p.osm_key === "leisure" && p.osm_value === "sports_centre" && /\b(gym|fitness|cross\s?fit|yoga|pilates|training facility|sportune|pcyc)\b/i.test(String(p.name));
  const sports = String(p.sport || (p.osm_key === "sport" ? p.osm_value : "")).split(";");
  if (!venue && !fitnessCentre && !sports.some(value => fitnessSports.test(value.trim()))) return;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const suburb = String(p.city || p.locality || p.district || "");
  const state = states[String(p.state)] || String(p.state || "");
  return { provider: "openstreetmap", placeId: `${p.osm_type}:${p.osm_id}`, name: String(p.name),
    formattedAddress: [street, suburb, [state, p.postcode].filter(Boolean).join(" "), p.country || "Australia"].filter(Boolean).join(", "),
    suburb, state, postcode: String(p.postcode || ""), country: "Australia", longitude: coordinates?.[0], latitude: coordinates?.[1], primaryType: sports.find(value => fitnessSports.test(value)) || String(p.osm_value) };
}
async function areaVenues(options: GymSearchOptions): Promise<Feature[]> {
  const { latitude, longitude } = options;
  if (latitude === undefined || longitude === undefined || latitude < -44 || latitude > -9 || longitude < 112 || longitude > 154) return [];
  const key = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const cached = areaCache.get(key); if (cached && cached.until > Date.now()) return cached.features;
  // An area query includes venues whose secondary sport tags are absent from the geocoder index.
  const around = `around:20000,${latitude},${longitude}`;
  const query = `[out:json][timeout:6];(nwr(${around})["leisure"~"^(fitness_centre|sports_centre|fitness_station)$"]["name"];nwr(${around})["sport"~"(^|;)(fitness|crossfit|yoga|pilates|weightlifting|bodybuilding|gymnastics)(;|$)"]["name"];);out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ data: query }).toString(), signal: signal(options) });
  if (!response.ok) throw new Error("Area search unavailable");
  const payload = await response.json() as { elements?: Element[] };
  const features: Feature[] = (payload.elements ?? []).flatMap(element => {
    const tags = element.tags, lat = element.lat ?? element.center?.lat, lon = element.lon ?? element.center?.lon;
    if (!tags?.name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const country = tags["addr:country"];
    if (country && !["AU", "Australia"].includes(country)) return [];
    const leisure = ["fitness_centre", "sports_centre", "fitness_station"].includes(tags.leisure);
    return [{ geometry: { coordinates: [lon!, lat!] }, properties: {
      name: tags.name, osm_id: element.id, osm_type: { node: "N", way: "W", relation: "R" }[element.type] || element.type,
      osm_key: leisure ? "leisure" : "sport", osm_value: leisure ? tags.leisure : tags.sport, sport: tags.sport || "",
      countrycode: "AU", country: "Australia", city: tags["addr:city"] || "", state: tags["addr:state"] || "", postcode: tags["addr:postcode"] || "", street: tags["addr:street"] || "", housenumber: tags["addr:housenumber"] || "",
    } }];
  });
  if (areaCache.size >= 128) areaCache.delete(areaCache.keys().next().value!);
  areaCache.set(key, { until: Date.now() + 300000, features });
  return features;
}
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function placeForQuery(places: Feature[], query: string) {
  const text = normalise(query).replace(/\b(gyms?|fitness|centres?|yoga|pilates|studios?|in|near|australia)\b/g, " ").replace(/\s+/g, " ").trim();
  return places.find(place => {
    const p = place.properties;
    return ["city", "locality", "district", "county"].includes(String(p?.type)) && validPoint(place.geometry?.coordinates) &&
      (p?.postcode === text || normalise(String(p?.name || "")) === text || (text.length > 3 && text.startsWith(`${normalise(String(p?.name || ""))} `)));
  });
}

export class PublicGymSearchProvider implements GymSearchProvider {
  async search(query: string, options: GymSearchOptions = {}): Promise<SearchResult> {
    const key = JSON.stringify([query.trim().toLowerCase(), options.latitude, options.longitude, options.pageToken, Boolean(process.env.GOOGLE_PLACES_API_KEY)]);
    const cached = cache.get(key); if (cached && cached.until > Date.now()) return cached.value;
    if (pending.has(key)) return pending.get(key)!;
    const job = this.lookup(query, options).then(value => {
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(key, { until: Date.now() + (value.status === "configured" ? 300000 : 15000), value }); return value;
    }).finally(() => pending.delete(key));
    pending.set(key, job); return job;
  }
  private async lookup(query: string, options: GymSearchOptions): Promise<SearchResult> {
    const known = findKnownGyms(query);
    try {
      const google = await new GooglePlacesGymSearchProvider().search(query, options);
      if (google.status === "configured" && (google.results.length || options.pageToken)) return { ...google, results: mergeExternalGymResults(google.results, known) };
      if (options.pageToken) return { status: "error", results: [] };
    } catch { if (options.pageToken) return { status: "error", results: [] }; }
    const features: Feature[] = []; let successful = false;
    const nearby = /^gyms?$/i.test(query.trim()) && options.latitude !== undefined && options.longitude !== undefined;
    const jobs = await Promise.allSettled(nearby ? [photon(query, options, true), areaVenues(options)] : [photon(query, options), photon(query, options, false, false)]);
    if (jobs[0].status === "fulfilled") { features.push(...jobs[0].value); successful = true; }
    if (jobs[1].status === "fulfilled") {
      successful = true;
      if (nearby) features.push(...jobs[1].value);
      else {
        features.push(...jobs[1].value); // Also capture yoga/Pilates venues returned by the unfiltered name search.
        const coordinates = placeForQuery(jobs[1].value, query)?.geometry?.coordinates;
        if (validPoint(coordinates)) {
          const areaOptions = { ...options, latitude: coordinates[1], longitude: coordinates[0] };
          try { features.push(...await areaVenues(areaOptions)); }
          catch { try { features.push(...await photon(query, areaOptions, true)); } catch { /* Keep any successful name results. */ } }
        }
      }
    }
    const results = features.map(mapGym).filter((gym): gym is ExternalGymSearchResult => Boolean(gym));
    const nearbyDirectory = nearby ? mergeExternalGymResults(...features.map(feature => findKnownGyms(String(feature.properties?.city || feature.properties?.locality || "")))) : [];
    // Prefer the researched directory address over potentially outdated public-map tags.
    return { status: successful ? "configured" : "offline", results: mergeExternalGymResults(known, nearbyDirectory, results) };
  }
}
