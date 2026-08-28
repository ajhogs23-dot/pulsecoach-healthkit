import AsyncStorage from "@react-native-async-storage/async-storage";

export type ExerciseMedia = {
  imageUrl?: string;
  videoUrl?: string;
  description?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  attribution?: string;
};

const safeText = (value?: string) => value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function loadExerciseMedia(exerciseId: string, exerciseName: string): Promise<ExerciseMedia | undefined> {
  const cacheKey = `pulsecoach.exerciseMedia.${exerciseId}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as ExerciseMedia; } catch { /* fetch again */ }
  }

  try {
    const response = await fetch(`https://wger.de/api/v2/exerciseinfo/?language=2&limit=25&search=${encodeURIComponent(exerciseName)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return undefined;
    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const normalisedName = exerciseName.toLowerCase();
    const scored = results.map((result: any) => {
      const translations = Array.isArray(result.translations) ? result.translations : [];
      const translation = translations.find((item: any) => item.language === 2) ?? translations[0];
      const name = String(translation?.name ?? result.name ?? "").toLowerCase();
      const score = name === normalisedName ? 2 : name.includes(normalisedName) || normalisedName.includes(name) ? 1 : 0;
      return { result, translation, score };
    }).sort((a: any, b: any) => b.score - a.score);
    const match = scored[0];
    if (!match || match.score === 0) return undefined;

    const images = Array.isArray(match.result.images) ? match.result.images : [];
    const videos = Array.isArray(match.result.videos) ? match.result.videos : [];
    const image = images.find((item: any) => item.is_main) ?? images[0];
    const video = videos[0];
    const media: ExerciseMedia = {
      imageUrl: image?.image ?? image?.thumbnails?.medium ?? image?.thumbnails?.small,
      videoUrl: video?.video,
      description: safeText(match.translation?.description ?? match.result.description),
      primaryMuscles: (match.result.muscles ?? []).map((muscle: any) => muscle.name_en ?? muscle.name).filter(Boolean),
      secondaryMuscles: (match.result.muscles_secondary ?? []).map((muscle: any) => muscle.name_en ?? muscle.name).filter(Boolean),
      attribution: "Exercise media and descriptions supplied by wger contributors under the item’s listed open licence.",
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(media));
    return media;
  } catch {
    return undefined;
  }
}
