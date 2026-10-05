export type GymSearchOptions = { latitude?: number; longitude?: number; pageToken?: string; signal?: AbortSignal };
export type GymSearchSource = "google-places" | "openstreetmap" | "directory";
export type ExternalGymSearchResult = { provider: GymSearchSource; placeId: string; name: string; formattedAddress: string; suburb?: string; state?: string; postcode?: string; country?: string; latitude?: number; longitude?: number; primaryType?: string; businessStatus?: string; distanceKm?: number; sourceUrl?: string; aliases?: string[] };
export type GymSearchStatus = "configured" | "unconfigured" | "offline" | "error";
export type GymSearchProvider = { search(query: string, options?: GymSearchOptions): Promise<{ results: ExternalGymSearchResult[]; nextPageToken?: string; status?: GymSearchStatus }> };

// Directory entries identify venues only: they never seed or assume an equipment inventory.
const armidale = (placeId: string, name: string, address: string, sourceUrl: string, primaryType = "fitness_centre", aliases: string[] = [], postcode = "2350"): ExternalGymSearchResult => ({
  provider: "directory", placeId, name, formattedAddress: `${address}, Armidale NSW ${postcode}, Australia`, suburb: "Armidale", state: "NSW", postcode, country: "Australia", primaryType, sourceUrl, aliases,
});
export const KNOWN_GYMS: ExternalGymSearchResult[] = [{
  provider: "directory", placeId: "kings-gym-fitness-glen-innes", name: "Kings Gym & Fitness",
  formattedAddress: "211 Grey St, Glen Innes NSW 2370, Australia", suburb: "Glen Innes", state: "NSW", postcode: "2370", country: "Australia",
  sourceUrl: "https://www.gleninnesexaminer.com.au/local-business/services/glen%20innes-nsw/kings-gym-and-fitness-61417188896",
},
  armidale("anytime-fitness-armidale", "Anytime Fitness Armidale", "2/197 Beardy Street", "https://directory.ausactive.org.au/directory/business/072518/anytime-fitness-armidale"),
  armidale("snap-fitness-armidale", "Snap Fitness Armidale", "123 Beardy Street", "https://www.snapfitness.com/au/gyms/armidale-nsw"),
  armidale("elements-fitness-armidale", "Elements Fitness", "93 Rusden Street", "https://www.elementsfitness.com.au/contact"),
  armidale("crossfit-armidale", "CrossFit Armidale", "4B Southern Cross Drive", "https://crossfitarmidale.com.au/", "crossfit"),
  armidale("f45-armidale", "F45 Training Armidale", "3/244 Beardy Street", "https://f45training.com/au/studio/armidale/", "fitness_centre", ["F45 Armidale"]),
  // The two brands now share one membership and premises: show a single venue under either name.
  armidale("altitude-soul-armidale", "Altitude Fitness & Soul Studio", "171 Rusden Street", "https://altitudefitnessarmidale.com.au/", "fitness_centre", ["Altitude Fitness Armidale", "Soul Studio Armidale", "yoga", "Pilates"]),
  armidale("sportune-armidale", "SportUNE", "University of New England, SportUNE Drive", "https://www.sportune.com.au/about-us/", "fitness_centre", ["UNE gym", "yoga", "Pilates"], "2351"),
  armidale("pcyc-armidale", "PCYC Armidale", "176 Rusden Street", "https://www.pcycnsw.org.au/armidale/"),
  armidale("njoy-pilates-armidale", "NJOY Pilates", "Hanna’s Arcade", "https://www.njoypilates.com/", "pilates"),
  armidale("gecko-yoga-armidale", "Gecko Yoga Armidale", "216 Marsh Street", "https://www.findglocal.com/AU/Armidale/103511431034685/Gecko-Yoga-Armidale", "yoga"),
];
const normalise = (value: string) => value.toLowerCase().replace(/\bcross\s+fit\b/g, "crossfit").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
export function findKnownGyms(query: string) {
  const words = normalise(query).split(" ").filter(word => word && !["gym", "gyms", "fitness", "centre", "centres", "studio", "studios", "in", "near", "at", "australia"].includes(word));
  return words.length ? KNOWN_GYMS.filter(gym => {
    const text = normalise(`${gym.name} ${gym.formattedAddress} ${gym.primaryType ?? ""} ${(gym.aliases ?? []).join(" ")}`);
    return words.every(word => text.includes(word));
  }) : [];
}

export function mergeExternalGymResults(...lists: ExternalGymSearchResult[][]): ExternalGymSearchResult[] {
  const results: ExternalGymSearchResult[] = [];
  for (const gym of lists.flat()) {
    const names = [gym.name, ...(gym.aliases ?? [])].map(normalise);
    const duplicate = results.some(existing => existing.provider === gym.provider && existing.placeId === gym.placeId ||
      Boolean(gym.postcode && gym.postcode === existing.postcode && [existing.name, ...(existing.aliases ?? [])].map(normalise).some(name => names.includes(name))));
    if (!duplicate) results.push(gym);
  }
  return results;
}
