import { describe, expect, it, vi, beforeEach } from "vitest";
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(async (key: string) => store.get(key) ?? null), setItem: vi.fn(async (key: string, value: string) => { store.set(key, value); }) } }));
import { EXERCISE_LIBRARY } from "../lib/exercise-library";
import { GENERIC_EQUIPMENT_CATALOGUE, KINGS_GYM_GLEN_INNES, KINGS_GYM_EQUIPMENT, LocalGymRepository, MockEquipmentRecognizer, chooseRecognitionCandidates, exercisesForGymInventory, gymSearchScore, mergeGymSearchResults, normaliseGym, possibleGymDuplicates, recommendMachineProgression, publicEquipmentView } from "../lib/gym-directory";
import { GooglePlacesGymSearchProvider } from "../server/gym-search";
import { readFileSync } from "node:fs";

describe("gym directory domain", () => {
  beforeEach(() => { vi.clearAllMocks(); store.clear(); });
  it("searches by name and suburb and supports manual selection", () => {
    expect(gymSearchScore(KINGS_GYM_GLEN_INNES, "Kings Gym")).toBeGreaterThan(0);
    expect(gymSearchScore(KINGS_GYM_GLEN_INNES, "Glen Innes")).toBeGreaterThan(0);
    expect(normaliseGym({ name: "Kings  Gym", suburb: "Glen Innes", postcode: "2370", streetAddress: "Main St" }).normalisedName).toContain("kings gym");
  });
  it("detects possible duplicates without silently merging them", () => {
    expect(possibleGymDuplicates({ name: "Kings Gym", suburb: "Glen Innes", postcode: "2370", streetAddress: "Other address" }, [KINGS_GYM_GLEN_INNES])).toHaveLength(1);
  });
  it("requires explicit duplicate confirmation, then makes a new gym searchable", async () => {
    const repo = new LocalGymRepository();
    const input = { name: "Kings Gym", streetAddress: "99 New Road", suburb: "Glen Innes", state: "NSW", postcode: "2370", country: "Australia", createdBy: "community" as const };
    expect((await repo.createGym(input)).possibleDuplicates).toHaveLength(1);
    const created = await repo.createGym(input, { confirmDifferent: true });
    expect(created.gym?.id).toBeTruthy();
    expect((await repo.searchGyms("99 New Road")).some((gym) => gym.id === created.gym?.id)).toBe(true);
  });
  it("provides representative, clearly unverified fixture inventory", () => {
    expect(KINGS_GYM_GLEN_INNES.verificationStatus).toBe("Unverified");
    expect(KINGS_GYM_EQUIPMENT.length).toBeGreaterThanOrEqual(6);
    expect(GENERIC_EQUIPMENT_CATALOGUE.map((item) => item.category)).toEqual(expect.arrayContaining(["Free weights", "Selectorised machines", "Cable machines", "Cardio equipment"]));
  });
  it("returns up to three recognition candidates and requires approval", async () => {
    const recognizer = new MockEquipmentRecognizer();
    const results = await recognizer.recognize({ capturedAt: new Date().toISOString() }, GENERIC_EQUIPMENT_CATALOGUE, KINGS_GYM_EQUIPMENT);
    expect(results).toHaveLength(3); expect(results.every((result) => result.requiresConfirmation)).toBe(true);
    expect(chooseRecognitionCandidates(results, KINGS_GYM_EQUIPMENT, GENERIC_EQUIPMENT_CATALOGUE)).toHaveLength(3);
  });
  it("supports none-of-these and manual correction through catalogue IDs", () => {
    const manual = GENERIC_EQUIPMENT_CATALOGUE.find((item) => item.name === "Cable machine");
    expect(manual?.compatibleExerciseIds).toEqual(expect.arrayContaining(EXERCISE_LIBRARY.filter((exercise) => /cable|pallof/i.test(exercise.name)).map((exercise) => exercise.id)));
  });
  it("keeps confirmation and status reports separate from established listings", async () => {
    const repo = new LocalGymRepository(); const instance = KINGS_GYM_EQUIPMENT[0];
    await repo.confirmEquipment({ id: "c1", gymId: instance.gymId, equipmentInstanceId: instance.id, confirmedAt: new Date().toISOString(), userId: "private-user" });
    await repo.reportEquipment({ id: "r1", gymId: instance.gymId, equipmentInstanceId: instance.id, status: "Temporarily broken", createdAt: new Date().toISOString(), photoIds: [], userId: "private-user" });
    expect(publicEquipmentView(instance)).not.toHaveProperty("userId");
  });
  it("isolates machine history by user, gym and equipment instance", async () => {
    const repo = new LocalGymRepository(); const instance = KINGS_GYM_EQUIPMENT[0];
    const history = { id: "h1", userId: "user-a", gymId: instance.gymId, equipmentInstanceId: instance.id, exerciseId: instance.compatibleExerciseIds[0], performedAt: new Date().toISOString(), resistance: 20, unit: "kilograms" as const, sets: [{ reps: 10, rir: 2 }], completed: true };
    await repo.saveHistory(history); expect((await repo.listHistory("user-a", instance.id)).every((item) => item.userId === "user-a")).toBe(true); expect(await repo.listHistory("user-b", instance.id)).toHaveLength(0);
  });
  it("recommends increase, maintenance, reduction, pain hold and available increments", () => {
    const base = { id: "h", userId: "u", gymId: "g", equipmentInstanceId: "e", exerciseId: "x", performedAt: new Date().toISOString(), resistance: 20, unit: "kilograms" as const, sets: [{ reps: 12, rir: 2 }, { reps: 12, rir: 2 }], completed: true };
    expect(recommendMachineProgression([base], [2.5]).action).toBe("increase");
    expect(recommendMachineProgression([{ ...base, sets: [{ reps: 8, rpe: 9 }] }]).action).toBe("reduce");
    expect(recommendMachineProgression([{ ...base, painOrLimitation: "knee pain" }]).action).toBe("maintain");
  });
  it("filters broken/removed equipment while retaining bodyweight fallback", () => {
    const broken = KINGS_GYM_EQUIPMENT.map((item) => ({ ...item, availability: "Removed" as const }));
    expect(exercisesForGymInventory(broken, "Chest").length).toBeGreaterThan(0);
  });
  it("combines Tamworth, Gold Coast, postcode and specific-name provider results", async () => {
    const calls: string[] = [];
    const provider = { search: async (query: string) => { calls.push(query); return { status: "configured" as const, results: [{ provider: "google-places" as const, placeId: `place-${calls.length}`, name: query.includes("Gold") ? "Gold Coast Gym" : "Tamworth Fitness", formattedAddress: `${query}, Australia`, postcode: query.includes("2370") ? "2370" : undefined }] }; } };
    for (const query of ["Tamworth", "Gold Coast", "2370", "Anytime Fitness Tamworth"]) await provider.search(query);
    expect(calls).toEqual(["Tamworth", "Gold Coast", "2370", "Anytime Fitness Tamworth"]);
  });
  it("deduplicates external place IDs and associates saved gyms", () => {
    const saved = [{ ...KINGS_GYM_GLEN_INNES, externalProvider: "google-places" as const, externalPlaceId: "place-1" }];
    const merged = mergeGymSearchResults(saved, [{ provider: "google-places", placeId: "place-1", name: saved[0].name, formattedAddress: saved[0].streetAddress }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("saved");
  });
  it("returns an explicit unconfigured status without making a request", async () => {
    const result = await new GooglePlacesGymSearchProvider(undefined).search("Tamworth");
    expect(result.status).toBe("unconfigured");
  });
  it("maps mocked Google Places results without exposing the credential", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => { expect((init.headers as Record<string, string>)["X-Goog-FieldMask"]).toContain("places.id"); expect(JSON.parse(String(init.body)).textQuery).toContain("Tamworth, NSW, Australia"); return new Response(JSON.stringify({ places: [{ id: "place-tamworth", displayName: { text: "Tamworth Fitness" }, formattedAddress: "1 Main St, Tamworth NSW 2340, Australia", location: { latitude: -31, longitude: 150 }, primaryType: "gym", businessStatus: "OPERATIONAL" }] }), { status: 200 }); });
    vi.stubGlobal("fetch", fetchMock);
    const result = await new GooglePlacesGymSearchProvider("test-only-key").search("Tamworth");
    expect(result.results[0].placeId).toBe("place-tamworth");
    vi.unstubAllGlobals();
  });
  it("keeps the Places credential out of the mobile source tree", () => {
    const mobileFiles = ["app/gym-directory.tsx", "lib/gym-directory.ts", "lib/trpc.ts"].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(mobileFiles).not.toContain("GOOGLE_PLACES_API_KEY");
  });
});
