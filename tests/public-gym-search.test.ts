import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicGymSearchProvider } from "../server/public-gym-search";
import { findKnownGyms } from "../shared/gym-search-types";
const feature = (name: string, id = 22) => ({ geometry: { coordinates: [151.2, -33.8] }, properties: { name, osm_id: id, osm_type: "N", osm_key: "leisure", osm_value: "fitness_centre", countrycode: "AU", country: "Australia", city: "Sydney", state: "New South Wales", postcode: "2000", street: "Test St" } });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("gym fallback and condition catalogue", () => {
  it("finds Kings Gym by name, partial name, suburb and postcode without live service", async () => {
    for (const query of ["Kings", "Kings Gym", "Glen Innes", "2370"]) expect(findKnownGyms(query)[0].name).toBe("Kings Gym & Fitness");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", ""); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    const result = await new PublicGymSearchProvider().search("Kings Gym");
    expect(result.results[0].provider).toBe("directory"); expect(result.status).toBe("offline");
  });
  it("returns real gym identities with truthful attribution when Google is unconfigured", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ features: [feature("Anytime Fitness Test")] })));
    vi.stubGlobal("fetch", request);
    const result = await new PublicGymSearchProvider().search("Anytime Fitness Test");
    expect(result.status).toBe("configured"); expect(result.results[0]).toMatchObject({ provider: "openstreetmap", placeId: "N:22", state: "NSW" });
    expect(String(request.mock.calls[0][0])).toContain("countrycode=AU");
  });
  it("searches gyms around a town when only its geocoded place is available", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ features: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ features: [{ geometry: { coordinates: [150.9, -31.1] }, properties: { type: "city", name: "Tamworth" } }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ features: [feature("Regional Fitness", 23)] })));
    vi.stubGlobal("fetch", request);
    const result = await new PublicGymSearchProvider().search("Test town");
    expect(result.results[0].name).toBe("Regional Fitness"); expect(String(request.mock.calls[2][0])).toContain("reverse/");
    expect(String(request.mock.calls[2][0])).toContain("lat=-31.1");
  });
  it("supports nearby search and does not treat non-gym places as gyms", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ features: [feature("Nearby Fitness", 24), { ...feature("Cafe", 25), properties: { ...feature("Cafe", 25).properties, osm_key: "amenity", osm_value: "cafe" } }] })));
    vi.stubGlobal("fetch", request);
    const result = await new PublicGymSearchProvider().search("gyms", { latitude: -31, longitude: 151 });
    expect(result.results).toHaveLength(1); expect(String(request.mock.calls[0][0])).toContain("radius=25");
  });
  it("handles non-JSON service failures and reuses successful requests", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const request = vi.fn().mockResolvedValueOnce(new Response("<!DOCTYPE html>", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ features: [feature("Cached Gym", 26)] })));
    vi.stubGlobal("fetch", request);
    expect((await new PublicGymSearchProvider().search("Failure test")).status).toBe("offline");
    const provider = new PublicGymSearchProvider(); await provider.search("Cache test"); await provider.search("Cache test");
    expect(request).toHaveBeenCalledTimes(2);
  });
});
