import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicGymSearchProvider } from "../server/public-gym-search";
import { GooglePlacesGymSearchProvider } from "../server/gym-search";
import { findKnownGyms, mergeExternalGymResults } from "../shared/gym-search-types";
const feature = (name: string, id = 22, sport?: string) => ({ geometry: { coordinates: [151.668, -30.51] }, properties: { name, osm_id: id, osm_type: "N", osm_key: sport ? "sport" : "leisure", osm_value: sport ?? "fitness_centre", countrycode: "AU", country: "Australia", city: "Testville", state: "New South Wales", postcode: "2350", street: "Test St" } });
const json = (body: unknown) => new Response(JSON.stringify(body));
const place = (name: string, id: string, primaryType = "gym") => ({ id, displayName: { text: name }, formattedAddress: "1 Main St, Testville NSW 2350, Australia", primaryType });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("gym and studio search coverage", () => {
  it("returns ten Armidale venues by town, including CrossFit, yoga and Pilates, without inventing equipment", () => {
    const results = findKnownGyms("Armidale"); expect(results).toHaveLength(10);
    expect(results.map(gym => gym.name)).toEqual(expect.arrayContaining(["CrossFit Armidale", "Gecko Yoga Armidale", "NJOY Pilates"]));
    expect(findKnownGyms("gyms in Armidale")).toHaveLength(10);
    expect(findKnownGyms("yoga Armidale").map(gym => gym.name)).toContain("Gecko Yoga Armidale");
    expect(findKnownGyms("Cross Fit Armidale").map(gym => gym.name)).toEqual(["CrossFit Armidale"]);
    expect(findKnownGyms("Soul Studio Armidale")[0].placeId).toBe("altitude-soul-armidale");
    expect(results.every(gym => gym.sourceUrl && !("equipment" in gym))).toBe(true);
  });
  it("keeps Kings Gym and researched listings available during an outage", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", ""); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    for (const query of ["Kings", "Kings Gym", "Glen Innes", "2370"]) expect(findKnownGyms(query)[0].name).toBe("Kings Gym & Fitness");
    const result = await new PublicGymSearchProvider().search("Armidale");
    expect(result.results).toHaveLength(10); expect(result.status).toBe("offline");
  });
  it("runs a full town-area search even when name search already finds a gym", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn(async (rawUrl: string, init?: RequestInit) => {
      const url = String(rawUrl);
      if (url.includes("overpass")) {
        const query = new URLSearchParams(String(init?.body)).get("data")!;
        expect(query).toContain("yoga|pilates"); expect(query).toContain("crossfit");
        return json({ elements: [{ type: "node", id: 23, lat: -30.52, lon: 151.67, tags: { name: "Testville Yoga", sport: "yoga", "addr:city": "Testville" } }, { type: "way", id: 24, center: { lat: -30.52, lon: 151.67 }, tags: { name: "Testville Pilates", sport: "pilates" } }] });
      }
      const parsed = new URL(url);
      return parsed.searchParams.has("osm_tag") ? json({ features: [feature("Testville Gym")] }) : json({ features: [{ geometry: { coordinates: [151.6691, -30.5191] }, properties: { type: "city", name: "Testville", countrycode: "AU" } }] });
    });
    vi.stubGlobal("fetch", request);
    const result = await new PublicGymSearchProvider().search("Testville");
    expect(result.results.map(gym => gym.name)).toEqual(expect.arrayContaining(["Testville Gym", "Testville Yoga", "Testville Pilates"]));
    expect(request).toHaveBeenCalledTimes(3); expect(result.results.every(gym => gym.provider === "openstreetmap")).toBe(true);
  });
  it("accepts studios tagged as sports and rejects unrelated or overseas places", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => json({ features: [feature("Name Match Yoga", 26, "yoga"), { ...feature("Cafe", 27), properties: { ...feature("Cafe", 27).properties, osm_key: "amenity", osm_value: "cafe" } }, { ...feature("US Gym", 28), properties: { ...feature("US Gym", 28).properties, countrycode: "US" } }, { ...feature("Pistol Club", 29), properties: { ...feature("Pistol Club", 29).properties, osm_value: "sports_centre", sport: "shooting" } }] })));
    const result = await new PublicGymSearchProvider().search("Name Match Yoga");
    expect(result.results.map(gym => gym.name)).toEqual(["Name Match Yoga"]);
  });
  it("uses a reverse-search fallback when the full area provider is down", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn(async (rawUrl: string) => {
      const url = String(rawUrl);
      if (url.includes("overpass")) throw new Error("busy");
      const parsed = new URL(url);
      if (url.includes("reverse")) return json({ features: [feature("Fallback Fitness", 30)] });
      if (parsed.searchParams.has("osm_tag")) return json({ features: [] });
      return json({ features: [{ geometry: { coordinates: [150.919, -31.119] }, properties: { type: "city", name: "Fallback town" } }] });
    });
    vi.stubGlobal("fetch", request);
    expect((await new PublicGymSearchProvider().search("Fallback town")).results[0].name).toBe("Fallback Fitness");
    expect(request.mock.calls.some(([url]) => String(url).includes("radius=20"))).toBe(true);
  });
  it("keeps nearby name results when area search fails and caches repeated requests", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn(async (url: string) => String(url).includes("overpass") ? Promise.reject(new Error("busy")) : json({ features: [feature("Nearby Fitness", 31)] }));
    vi.stubGlobal("fetch", request);
    const provider = new PublicGymSearchProvider();
    const options = { latitude: -31.128, longitude: 151.229 };
    expect((await provider.search("gyms", options)).results[0].name).toBe("Nearby Fitness");
    await provider.search("gyms", options); expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not replace a failed Google pagination request with unrelated fallback results", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key"); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await new PublicGymSearchProvider().search("Expired page", { pageToken: "expired" })).status).toBe("error");
    expect(request).not.toHaveBeenCalled();
  });
  it("includes the local directory when nearby map results identify Armidale", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("overpass") ? json({ elements: [] }) : json({ features: [{ ...feature("Armidale Fitness", 33), properties: { ...feature("Armidale Fitness", 33).properties, city: "Armidale" } }] })));
    const results = (await new PublicGymSearchProvider().search("gyms", { latitude: -30.5181, longitude: 151.6611 })).results;
    expect(results.map(gym => gym.name)).toEqual(expect.arrayContaining(["Anytime Fitness Armidale", "Gecko Yoga Armidale", "NJOY Pilates"]));
  });
  it("deduplicates a directory alias without merging unrelated studios at the same address", () => {
    const known = findKnownGyms("Soul Studio Armidale")[0];
    const live = { ...known, provider: "google-places" as const, placeId: "live", name: "Soul Studio Armidale", aliases: undefined };
    expect(mergeExternalGymResults([live], [known])).toHaveLength(1);
    expect(mergeExternalGymResults([live], [{ ...known, name: "Another studio", aliases: undefined }])).toHaveLength(2);
  });
});
describe("Google gym and studio search", () => {
  it("searches gyms, yoga and Pilates for a town and excludes the town itself", async () => {
    const request = vi.fn(async (_url: string, init: RequestInit) => {
      const text = JSON.parse(String(init.body)).textQuery as string;
      expect(text).toContain("Testville"); expect(text).toContain("Australia");
      return json({ places: [text.startsWith("yoga") ? place("Yoga studio", "yoga", "yoga_studio") : text.startsWith("Pilates") ? place("Pilates studio", "pilates", "pilates_studio") : place("CrossFit centre", "crossfit"), place("Testville", "town", "locality"), place("Duplicate Gym", "duplicate")] });
    });
    vi.stubGlobal("fetch", request);
    const result = await new GooglePlacesGymSearchProvider("test-key").search("Testville");
    expect(request).toHaveBeenCalledTimes(3); expect(result.results.map(gym => gym.name)).toEqual(["CrossFit centre", "Duplicate Gym", "Yoga studio", "Pilates studio"]);
    expect(result.results[0].suburb).toBe("Testville");
  });
  it("preserves every branch's query and continuation token when loading the next page", async () => {
    const token = "x".repeat(700);
    const request = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return json({ places: [place(body.pageToken ? "Later Gym" : "First Gym", body.pageToken ? "later" : "first")], nextPageToken: !body.pageToken && body.textQuery.startsWith("gyms") ? token : undefined });
    });
    vi.stubGlobal("fetch", request);
    const provider = new GooglePlacesGymSearchProvider("test-key");
    const first = await provider.search("Pagination town"); expect(first.nextPageToken!.length).toBeLessThan(512);
    const next = await provider.search("Pagination town", { pageToken: first.nextPageToken });
    expect(next.results[0].name).toBe("Later Gym"); expect(request).toHaveBeenCalledTimes(4);
    const original = JSON.parse(String(request.mock.calls[0][1].body)), continuation = JSON.parse(String(request.mock.calls[3][1].body));
    expect(continuation).toEqual({ ...original, pageToken: token });
    expect((await provider.search("Different town", { pageToken: first.nextPageToken })).status).toBe("error"); expect(request).toHaveBeenCalledTimes(4);
  });
  it("searches an explicit business name once, without adding unrelated studio searches", async () => {
    const request = vi.fn().mockResolvedValue(json({ places: [place("CrossFit Armidale", "crossfit")] })); vi.stubGlobal("fetch", request);
    await new GooglePlacesGymSearchProvider("test-key").search("CrossFit Armidale");
    expect(request).toHaveBeenCalledTimes(1); expect(JSON.parse(String(request.mock.calls[0][1].body)).textQuery).toBe("CrossFit Armidale, Australia");
  });
  it("retains successful category results when one request fails", async () => {
    const request = vi.fn(async (_url: string, init: RequestInit) => JSON.parse(String(init.body)).textQuery.startsWith("yoga") ? new Response("unavailable", { status: 503 }) : json({ places: [place("Partial Gym", "partial")] }));
    vi.stubGlobal("fetch", request);
    const result = await new GooglePlacesGymSearchProvider("test-key").search("Partial town");
    expect(result.status).toBe("configured"); expect(result.results).toHaveLength(1); expect(result.nextPageToken).toBeTruthy();
  });
});
