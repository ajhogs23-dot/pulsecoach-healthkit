import type { GymSearchSource, ExternalGymSearchResult } from "../shared/gym-search-types";
export type { GymSearchOptions, ExternalGymSearchResult, GymSearchProvider } from "../shared/gym-search-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExerciseLibraryItem } from "./exercise-library";
import { EXERCISE_LIBRARY } from "./exercise-library";

export type VerificationStatus = "Unverified" | "Community confirmed" | "Gym verified" | "Disputed" | "Removed";
export type EquipmentAvailability = "Available" | "Temporarily broken" | "Removed" | "Replaced" | "Disputed" | "Unknown";
export type ResistanceUnit = "kilograms" | "pounds" | "plates" | "resistance level" | "bodyweight";

export type Gym = {
  id: string; name: string; normalisedName: string; streetAddress: string; suburb: string; state: string;
  postcode: string; country: string; latitude?: number; longitude?: number; distanceKm?: number; phone?: string; website?: string;
  externalProvider?: GymSearchSource; externalPlaceId?: string;
  createdBy: "community" | "gym"; createdAt: string; lastConfirmedAt?: string; verificationStatus: VerificationStatus;
};
export type GenericEquipmentType = {
  id: string; name: string; category: string; aliases: string[]; compatibleExerciseIds: string[];
  primaryMuscles: string[]; secondaryMuscles: string[]; setupInstructions: string; movementInstructions: string; safetyGuidance: string;
};
export type EquipmentBrandModel = { manufacturer: string; model?: string; modelNumber?: string };
export type EquipmentPhoto = { id: string; equipmentInstanceId?: string; uri: string; capturedAt: string; isPrimary: boolean };
export type GymEquipmentInstance = {
  id: string; gymId: string; genericEquipmentTypeId: string; brandModel?: EquipmentBrandModel; serialOrLabel?: string;
  nickname?: string; resistanceType?: string; availableWeightIncrements?: number[]; unit: ResistanceUnit;
  pulleyNotes?: string; adjustments?: { seat?: string; pad?: string; handle?: string; cable?: string; rangeOfMotion?: string };
  compatibleExerciseIds: string[]; primaryMuscles: string[]; secondaryMuscles: string[]; setupInstructions: string;
  movementInstructions: string; safetyGuidance: string; approvedExerciseIds: string[]; videoExerciseIds: string[];
  photoIds: string[]; availability: EquipmentAvailability; verificationStatus: VerificationStatus;
  confirmationCount: number; lastConfirmedAt?: string; createdAt: string;
};
export type EquipmentConfirmation = { id: string; gymId: string; equipmentInstanceId: string; confirmedAt: string; note?: string; userId: string };
export type EquipmentStatusReport = { id: string; gymId: string; equipmentInstanceId: string; status: Exclude<EquipmentAvailability, "Available" | "Unknown">; createdAt: string; note?: string; photoIds: string[]; userId: string };
export type UserMachineHistory = { id: string; userId: string; gymId: string; equipmentInstanceId: string; exerciseId: string; performedAt: string; resistance?: number; unit: ResistanceUnit; sets: Array<{ reps: number; rpe?: number; rir?: number }>; completed: boolean; settings?: { seat?: string; pad?: string; handle?: string; cable?: string; rangeOfMotion?: string }; notes?: string; painOrLimitation?: string };
export type UserMachineSettings = { userId: string; gymId: string; equipmentInstanceId: string; exerciseId: string; updatedAt: string; settings: NonNullable<UserMachineHistory["settings"]> };

export type GymRepository = {
  searchGyms(query: string): Promise<Gym[]>; nearbyGyms(latitude: number, longitude: number, radiusKm?: number): Promise<Gym[]>;
  getGym(id: string): Promise<Gym | undefined>; createGym(input: Omit<Gym, "id" | "normalisedName" | "createdAt" | "verificationStatus">, options?: { confirmDifferent?: boolean }): Promise<{ gym?: Gym; possibleDuplicates: Gym[] }>;
  listEquipment(gymId: string): Promise<GymEquipmentInstance[]>; saveEquipment(instance: GymEquipmentInstance): Promise<void>; savePhoto(photo: EquipmentPhoto): Promise<void>;
  confirmEquipment(input: EquipmentConfirmation): Promise<void>; reportEquipment(input: EquipmentStatusReport): Promise<void>;
  saveHistory(history: UserMachineHistory): Promise<void>; listHistory(userId: string, equipmentInstanceId?: string, exerciseId?: string): Promise<UserMachineHistory[]>;
  saveSettings(settings: UserMachineSettings): Promise<void>; getSettings(userId: string, equipmentInstanceId: string, exerciseId: string): Promise<UserMachineSettings | undefined>;
  queueOffline(item: { kind: "confirmation" | "status-report"; payload: EquipmentConfirmation | EquipmentStatusReport }): Promise<void>;
};

export type GymSearchResponse = { results: Array<{ source: "saved" | "external"; gym?: Gym; external?: ExternalGymSearchResult; savedMatch?: Gym }>; nextPageToken?: string; liveStatus: "configured" | "unconfigured" | "offline" | "error" };

export function mergeGymSearchResults(saved: Gym[], external: ExternalGymSearchResult[]): GymSearchResponse["results"] {
  const byPlace = new Map(saved.filter((gym) => gym.externalProvider && gym.externalPlaceId).map((gym) => [`${gym.externalProvider}:${gym.externalPlaceId}`, gym]));
  const results: GymSearchResponse["results"] = saved.map((gym) => ({ source: "saved", gym }));
  for (const item of external) {
    const identity = byPlace.get(`${item.provider}:${item.placeId}`);
    const normalizedExternal = normalise(`${item.name} ${item.formattedAddress} ${item.postcode ?? ""}`);
    const fuzzy = saved.find((gym) => normalise(`${gym.name} ${gym.streetAddress} ${gym.postcode}`) === normalizedExternal || (normalise(gym.name) === normalise(item.name) && !!item.postcode && gym.postcode === item.postcode));
    results.push({ source: "external", external: item, savedMatch: identity ?? fuzzy });
  }
  return results.filter((entry, index, all) => { if (entry.source === "saved") return true; if (entry.savedMatch) return false; const item = entry.external!; return all.findIndex((candidate) => candidate.source === "external" && candidate.external!.placeId === item.placeId) === index; });
}

const normalise = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export function normaliseGym(input: Pick<Gym, "name" | "suburb" | "postcode" | "streetAddress">) { return { ...input, normalisedName: normalise(`${input.name} ${input.suburb} ${input.postcode} ${input.streetAddress}`) }; }
export function gymSearchScore(gym: Gym, query: string) { const q = normalise(query); if (!q) return 0; const name = normalise(gym.name); const haystack = normalise(`${gym.name} ${gym.suburb} ${gym.postcode} ${gym.streetAddress}`); return name === q ? 120 : haystack === q ? 100 : name.includes(q) ? 95 : haystack.includes(q) ? 80 : q.split(" ").filter((part) => haystack.includes(part)).length * 15; }
export function possibleGymDuplicates(candidate: Pick<Gym, "name" | "suburb" | "postcode" | "streetAddress" | "latitude" | "longitude">, gyms: Gym[]) {
  const name = normalise(candidate.name); return gyms.filter((gym) => {
    const closeName = normalise(gym.name) === name || normalise(gym.name).includes(name) || name.includes(normalise(gym.name));
    const closeAddress = normalise(gym.suburb) === normalise(candidate.suburb) && gym.postcode === candidate.postcode;
    const closeCoordinates = candidate.latitude !== undefined && gym.latitude !== undefined && candidate.longitude !== undefined && gym.longitude !== undefined && Math.abs(candidate.latitude - gym.latitude) < 0.02 && Math.abs(candidate.longitude - gym.longitude) < 0.02;
    return (closeName && closeAddress) || closeCoordinates;
  });
}
export function findSavedGymByExternalIdentity(gyms: Gym[], provider: Gym["externalProvider"], placeId?: string) { return placeId ? gyms.find((gym) => gym.externalProvider === provider && gym.externalPlaceId === placeId) : undefined; }

const cardio = EXERCISE_LIBRARY.filter((exercise) => exercise.muscleGroup === "Cardio").map((exercise) => exercise.id);
const type = (equipmentType: string, name: string, category: string, compatibleExerciseIds: string[], primaryMuscles: string[], secondaryMuscles: string[], setupInstructions: string) => ({ id: equipmentType, name, category, aliases: [], compatibleExerciseIds, primaryMuscles, secondaryMuscles, setupInstructions, movementInstructions: "Use a controlled range and keep posture stable throughout the movement.", safetyGuidance: "Start light, check the adjustment and stop for sharp pain or dizziness." }) satisfies GenericEquipmentType;
export const GENERIC_EQUIPMENT_CATALOGUE: GenericEquipmentType[] = [
  type("dumbbells", "Dumbbells", "Free weights", EXERCISE_LIBRARY.filter((e) => e.equipment.includes("Dumbbells")).map((e) => e.id), ["Arms", "Shoulders"], ["Core"], "Choose matching dumbbells and keep a clear lifting area."),
  type("barbell-rack", "Barbell and rack", "Benches and racks", EXERCISE_LIBRARY.filter((e) => /barbell|bench press|squat|deadlift/i.test(e.name)).map((e) => e.id), ["Legs", "Chest"], ["Core", "Back"], "Set the rack pins just below the lowest safe position."),
  type("selectorised-machine", "Selectorised machine", "Selectorised machines", EXERCISE_LIBRARY.filter((e) => e.equipment.includes("Full gym")).map((e) => e.id), ["Full body"], ["Core"], "Set the seat and pad so joints line up with the machine pivots."),
  type("cable-machine", "Cable machine", "Cable machines", EXERCISE_LIBRARY.filter((e) => /cable|pallof/i.test(e.name)).map((e) => e.id), ["Full body"], ["Core"], "Select a pin and attachment, then check the cable path is clear."),
  type("treadmill", "Treadmill", "Cardio equipment", cardio.filter((e) => /treadmill/i.test(e)), ["Legs"], ["Core"], "Clip the safety key and begin at a walking pace."),
  type("exercise-bike", "Exercise bike", "Cardio equipment", cardio.filter((e) => /bike/i.test(e)), ["Legs"], ["Core"], "Set saddle height so the knee stays softly bent at the bottom of the pedal stroke."),
  type("rower", "Rowing machine", "Cardio equipment", cardio.filter((e) => /row/i.test(e)), ["Legs", "Back"], ["Core", "Arms"], "Secure the feet and keep the spine long through the drive."),
  type("elliptical", "Elliptical trainer", "Cardio equipment", cardio.filter((e) => /elliptical/i.test(e)), ["Legs"], ["Shoulders"], "Place both feet fully on the pedals and hold the moving handles lightly."),
  type("stair-climber", "Stair climber", "Cardio equipment", cardio.filter((e) => /stair/i.test(e)), ["Legs"], ["Core"], "Stand tall and use the rails only for balance."),
  type("functional-training", "Functional training station", "Functional training equipment", EXERCISE_LIBRARY.filter((e) => e.equipment.includes("Full gym")).map((e) => e.id), ["Full body"], ["Core"], "Clear the station and confirm all attachments are locked."),
];

export const KINGS_GYM_GLEN_INNES: Gym = { id: "fixture-kings-gym-glen-innes", name: "Kings Gym Glen Innes", normalisedName: normalise("Kings Gym Glen Innes"), streetAddress: "Development fixture", suburb: "Glen Innes", state: "NSW", postcode: "2370", country: "Australia", latitude: -29.735, longitude: 151.738, createdBy: "community", createdAt: "2026-01-01T00:00:00.000Z", verificationStatus: "Unverified" };
export const KINGS_GYM_EQUIPMENT: GymEquipmentInstance[] = GENERIC_EQUIPMENT_CATALOGUE.slice(0, 9).map((item, index) => ({ id: `fixture-kings-equipment-${index + 1}`, gymId: KINGS_GYM_GLEN_INNES.id, genericEquipmentTypeId: item.id, nickname: `${item.name} station ${index + 1}`, unit: item.id === "treadmill" || item.id === "exercise-bike" ? "resistance level" : "kilograms", compatibleExerciseIds: item.compatibleExerciseIds, primaryMuscles: item.primaryMuscles, secondaryMuscles: item.secondaryMuscles, setupInstructions: item.setupInstructions, movementInstructions: item.movementInstructions, safetyGuidance: item.safetyGuidance, approvedExerciseIds: item.compatibleExerciseIds, videoExerciseIds: [], photoIds: [], availability: "Unknown", verificationStatus: "Unverified", confirmationCount: 0, createdAt: "2026-01-01T00:00:00.000Z" }));

type Stored = { gyms: Gym[]; equipment: GymEquipmentInstance[]; photos: EquipmentPhoto[]; confirmations: EquipmentConfirmation[]; reports: EquipmentStatusReport[]; history: UserMachineHistory[]; settings: UserMachineSettings[]; offline: Array<{ kind: "confirmation" | "status-report"; payload: EquipmentConfirmation | EquipmentStatusReport }> };
const storageKey = "pulsecoach.gym-directory.v1";
const initialData = (): Stored => ({ gyms: [KINGS_GYM_GLEN_INNES], equipment: KINGS_GYM_EQUIPMENT, photos: [], confirmations: [], reports: [], history: [], settings: [], offline: [] });
async function read(): Promise<Stored> { const raw = await AsyncStorage.getItem(storageKey); if (!raw) return initialData(); try { return { ...initialData(), ...JSON.parse(raw) }; } catch { return initialData(); } }
async function write(data: Stored) { await AsyncStorage.setItem(storageKey, JSON.stringify(data)); }

export class LocalGymRepository implements GymRepository {
  async searchGyms(query: string) { const data = await read(); return data.gyms.filter((gym) => gymSearchScore(gym, query) > 0).sort((a, b) => gymSearchScore(b, query) - gymSearchScore(a, query)); }
  async nearbyGyms(latitude: number, longitude: number, radiusKm = 25) { const data = await read(); return data.gyms.filter((gym) => gym.latitude !== undefined && gym.longitude !== undefined && Math.hypot((gym.latitude - latitude) * 111, (gym.longitude - longitude) * 90) <= radiusKm); }
  async getGym(gymId: string) { return (await read()).gyms.find((gym) => gym.id === gymId); }
  async createGym(input: Omit<Gym, "id" | "normalisedName" | "createdAt" | "verificationStatus">, options: { confirmDifferent?: boolean } = {}) { const data = await read(); const identityDuplicate = input.externalProvider && input.externalPlaceId ? data.gyms.filter((gym) => gym.externalProvider === input.externalProvider && gym.externalPlaceId === input.externalPlaceId) : []; const duplicates = identityDuplicate.length ? identityDuplicate : possibleGymDuplicates(input, data.gyms); if (duplicates.length && !options.confirmDifferent) return { possibleDuplicates: duplicates }; const gym: Gym = { ...input, id: id("gym"), normalisedName: normalise(input.name), createdAt: now(), verificationStatus: "Unverified" }; data.gyms.push(gym); await write(data); return { gym, possibleDuplicates: [] }; }
  async listEquipment(gymId: string) { return (await read()).equipment.filter((item) => item.gymId === gymId && item.verificationStatus !== "Removed"); }
  async saveEquipment(instance: GymEquipmentInstance) { const data = await read(); data.equipment = [...data.equipment.filter((item) => item.id !== instance.id), instance]; await write(data); }
  async savePhoto(photo: EquipmentPhoto) { const data = await read(); data.photos = [...data.photos.filter((item) => item.id !== photo.id), photo]; await write(data); }
  async confirmEquipment(input: EquipmentConfirmation) { const data = await read(); data.confirmations.push(input); const item = data.equipment.find((equipment) => equipment.id === input.equipmentInstanceId); if (item) { item.confirmationCount += 1; item.lastConfirmedAt = input.confirmedAt; if (item.verificationStatus === "Unverified" || item.verificationStatus === "Disputed") item.verificationStatus = "Community confirmed"; if (item.availability === "Unknown") item.availability = "Available"; } await write(data); }
  async reportEquipment(input: EquipmentStatusReport) { const data = await read(); data.reports.push(input); const item = data.equipment.find((equipment) => equipment.id === input.equipmentInstanceId); if (item && item.confirmationCount === 0) item.availability = input.status; else if (item) item.verificationStatus = "Disputed"; await write(data); }
  async saveHistory(history: UserMachineHistory) { const data = await read(); data.history.push(history); await write(data); }
  async listHistory(userId: string, equipmentInstanceId?: string, exerciseId?: string) { return (await read()).history.filter((item) => item.userId === userId && (!equipmentInstanceId || item.equipmentInstanceId === equipmentInstanceId) && (!exerciseId || item.exerciseId === exerciseId)); }
  async saveSettings(settings: UserMachineSettings) { const data = await read(); data.settings = [...data.settings.filter((item) => !(item.userId === settings.userId && item.equipmentInstanceId === settings.equipmentInstanceId && item.exerciseId === settings.exerciseId)), settings]; await write(data); }
  async getSettings(userId: string, equipmentInstanceId: string, exerciseId: string) { return (await read()).settings.find((item) => item.userId === userId && item.equipmentInstanceId === equipmentInstanceId && item.exerciseId === exerciseId); }
  async queueOffline(item: Stored["offline"][number]) { const data = await read(); data.offline.push(item); await write(data); }
}

export type EquipmentRecognitionRequest = { imageDataUrl?: string; gymId?: string; capturedAt: string };
export type EquipmentRecognitionResult = { genericEquipmentTypeId: string; brand?: string; model?: string; confidence: number; possibleGymEquipmentInstanceId?: string; evidence: string[]; compatibleExerciseIds: string[]; primaryMuscles: string[]; secondaryMuscles: string[]; recognitionSource: "mock" | "provider"; requiresConfirmation: boolean };
export type EquipmentRecognizer = { recognize(request: EquipmentRecognitionRequest, candidates: GenericEquipmentType[], confirmedAtGym: GymEquipmentInstance[]): Promise<EquipmentRecognitionResult[]> };
export class MockEquipmentRecognizer implements EquipmentRecognizer {
  async recognize(_request: EquipmentRecognitionRequest, candidates: GenericEquipmentType[], confirmedAtGym: GymEquipmentInstance[]) { return candidates.slice(0, 3).map((candidate, index) => ({ genericEquipmentTypeId: candidate.id, confidence: Math.max(0.42, 0.78 - index * 0.13), possibleGymEquipmentInstanceId: confirmedAtGym.find((item) => item.genericEquipmentTypeId === candidate.id)?.id, evidence: ["Development mock recognizer", "User confirmation required"], compatibleExerciseIds: candidate.compatibleExerciseIds, primaryMuscles: candidate.primaryMuscles, secondaryMuscles: candidate.secondaryMuscles, recognitionSource: "mock" as const, requiresConfirmation: true })); }
}
export function chooseRecognitionCandidates(results: EquipmentRecognitionResult[], confirmed: GymEquipmentInstance[], catalogue: GenericEquipmentType[]) { return [...results].sort((a, b) => b.confidence - a.confidence).slice(0, 3).map((result) => ({ ...result, possibleGymEquipmentInstanceId: result.possibleGymEquipmentInstanceId ?? confirmed.find((item) => item.genericEquipmentTypeId === result.genericEquipmentTypeId)?.id ?? undefined, genericEquipmentTypeId: catalogue.some((item) => item.id === result.genericEquipmentTypeId) ? result.genericEquipmentTypeId : "unknown" })); }

export type ProgressionRecommendation = { resistance?: number; unit: ResistanceUnit; action: "increase" | "maintain" | "reduce"; explanation: string };
export function recommendMachineProgression(history: UserMachineHistory[], increments: number[] = [1, 2.5, 5], targetReps = [8, 12]): ProgressionRecommendation {
  const latest = [...history].sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]; if (!latest?.resistance) return { action: "maintain", unit: latest?.unit ?? "kilograms", explanation: "No previous resistance is recorded; start conservatively and log today’s result." };
  if (latest.painOrLimitation) return { resistance: latest.resistance, unit: latest.unit, action: "maintain", explanation: "Pain or a movement limitation was recorded, so no increase is recommended." };
  const complete = latest.completed && latest.sets.length > 0 && latest.sets.every((set) => set.reps >= targetReps[1] && (set.rir ?? 0) >= 1);
  const hard = latest.sets.some((set) => set.reps < targetReps[0] || (set.rpe ?? 0) >= 9);
  if (hard) return { resistance: latest.resistance, unit: latest.unit, action: "reduce", explanation: "Repetitions or effort were outside the target range, so maintain control by reducing resistance." };
  if (!complete) return { resistance: latest.resistance, unit: latest.unit, action: "maintain", explanation: "The last workout was completed but did not meet every top-end target, so repeat the same resistance." };
  const increment = increments.find((value) => value > 0) ?? 0; return { resistance: latest.resistance + increment, unit: latest.unit, action: "increase", explanation: "All target sets reached the top of the rep range with reps in reserve; use the next available increment." };
}

export function exercisesForGymInventory(inventory: GymEquipmentInstance[], focus?: string) {
  const available = new Set(inventory.filter((item) => item.availability !== "Temporarily broken" && item.availability !== "Removed").flatMap((item) => item.compatibleExerciseIds));
  const candidates = EXERCISE_LIBRARY.filter((exercise) => (!focus || exercise.muscleGroup === focus) && (exercise.equipment.includes("Bodyweight") || exercise.equipment.includes("Dumbbells") || available.has(exercise.id)));
  return candidates.length ? candidates : EXERCISE_LIBRARY.filter((exercise) => !focus || exercise.muscleGroup === focus).slice(0, 3);
}

export function publicEquipmentView(instance: GymEquipmentInstance) { const { ...safe } = instance; return safe; }
