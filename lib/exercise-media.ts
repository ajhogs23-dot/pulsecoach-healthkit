import AsyncStorage from "@react-native-async-storage/async-storage";
import { exerciseNameScore, exerciseSearchTerms } from "@/lib/exercise-media-matching";

export type ExerciseMedia = {
  imageUrl?: string;
  videoUrl?: string;
  description?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  attribution?: string;
  matchedName?: string;
};

type CachedExerciseMedia = { savedAt: number; media: ExerciseMedia };
type LoadExerciseMediaOptions = { forceRefresh?: boolean; timeoutMs?: number };

const CACHE_VERSION = "v2";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_TIMEOUT_MS = 8000;
let cataloguePromise: Promise<any[]> | undefined;

const safeText = (value?: string) => value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function resultTranslation(result: any) {
  const translations = Array.isArray(result?.translations) ? result.translations : [];
  return translations.find((item: any) => item.language === 2) ?? translations[0];
}

function resultName(result: any) {
  const translation = resultTranslation(result);
  return String(translation?.name ?? result?.name ?? "");
}

async function fetchCatalogue(timeoutMs: number, forceRefresh = false) {
  if (cataloguePromise && !forceRefresh) return cataloguePromise;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  cataloguePromise = (async () => {
    try {
      const params = new URLSearchParams({ language: "2", limit: "1000" });
      const response = await fetch(`https://wger.de/api/v2/exerciseinfo/?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`wger request failed with ${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload?.results) ? payload.results : [];
    } finally {
      clearTimeout(timeout);
    }
  })();

  try {
    return await cataloguePromise;
  } catch (error) {
    cataloguePromise = undefined;
    throw error;
  }
}

function mediaFromResult(result: any): ExerciseMedia {
  const translation = resultTranslation(result);
  const images = Array.isArray(result?.images) ? result.images : [];
  const videos = Array.isArray(result?.videos) ? result.videos : [];
  const image = images.find((item: any) => item.is_main) ?? images[0];
  const video = videos[0];
  return {
    imageUrl: image?.image ?? image?.thumbnails?.medium ?? image?.thumbnails?.small,
    videoUrl: video?.video,
    description: safeText(translation?.description ?? result?.description),
    primaryMuscles: (result?.muscles ?? []).map((muscle: any) => muscle.name_en ?? muscle.name).filter(Boolean),
    secondaryMuscles: (result?.muscles_secondary ?? []).map((muscle: any) => muscle.name_en ?? muscle.name).filter(Boolean),
    attribution: "Exercise media and descriptions supplied by wger contributors under the item’s listed open licence.",
    matchedName: resultName(result),
  };
}

export async function loadExerciseMedia(exerciseId: string, exerciseName: string, options: LoadExerciseMediaOptions = {}): Promise<ExerciseMedia | undefined> {
  const cacheKey = `pulsecoach.exerciseMedia.${CACHE_VERSION}.${exerciseId}`;
  if (!options.forceRefresh) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedExerciseMedia;
        if (parsed.media && Date.now() - parsed.savedAt < CACHE_MAX_AGE_MS) return parsed.media;
      } catch {
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  }

  try {
    let best: { result: any; score: number } | undefined;
    const terms = exerciseSearchTerms(exerciseName);
    const results = await fetchCatalogue(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.forceRefresh);
    for (const result of results) {
      const candidateName = resultName(result);
      const score = Math.max(...terms.map((requested) => exerciseNameScore(requested, candidateName)));
      if (!best || score > best.score) best = { result, score };
    }
    if (!best || best.score < 45) return undefined;

    const media = mediaFromResult(best.result);
    if (!media.imageUrl && !media.videoUrl && !media.description) return undefined;
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), media } satisfies CachedExerciseMedia));
    return media;
  } catch {
    return undefined;
  }
}
