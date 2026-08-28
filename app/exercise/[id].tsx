import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { loadExerciseMedia, type ExerciseMedia } from "@/lib/exercise-media";

const mint = "#B8F36B";
const muted = "#A8B3A6";

const formGuides: Record<string, { steps: string[]; mistakes: string[] }> = {
  Chest: {
    steps: ["Set your shoulder blades gently back and down.", "Keep wrists stacked and move through a controlled range.", "Press without bouncing or forcing painful depth."],
    mistakes: ["Elbows flaring excessively", "Shoulders rolling forward", "Using momentum instead of control"],
  },
  Back: {
    steps: ["Brace your trunk before starting the pull.", "Lead with the elbows and keep shoulders away from your ears.", "Pause briefly, then return under control."],
    mistakes: ["Jerking the weight", "Shrugging toward the ears", "Rounding through the lower back"],
  },
  Shoulders: {
    steps: ["Keep ribs controlled and neck relaxed.", "Move the load smoothly without swinging.", "Stop the range if the shoulder pinches or feels unstable."],
    mistakes: ["Overarching the lower back", "Using momentum", "Forcing a painful range"],
  },
  Arms: {
    steps: ["Keep the upper arm stable.", "Move through a comfortable full range.", "Control both the lifting and lowering phases."],
    mistakes: ["Swinging the torso", "Letting elbows drift excessively", "Dropping the weight quickly"],
  },
  Legs: {
    steps: ["Brace your trunk and keep the whole foot supported.", "Track knees in line with the feet.", "Use a depth and load you can control."],
    mistakes: ["Knees collapsing inward", "Losing foot pressure", "Rushing the lowering phase"],
  },
  Core: {
    steps: ["Set your ribs over your pelvis.", "Breathe while maintaining tension.", "Stop before the lower back loses its controlled position."],
    mistakes: ["Holding the breath", "Arching the lower back", "Moving too quickly"],
  },
  Cardio: {
    steps: ["Begin easy and build intensity gradually.", "Keep a rhythm you can control with stable posture.", "Ease down before stopping and recover fully between hard intervals."],
    mistakes: ["Starting at maximum effort", "Losing posture as fatigue rises", "Ignoring dizziness, chest pain, or unusual symptoms"],
  },
};

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const exercise = useMemo(() => EXERCISE_LIBRARY.find((item) => item.id === exerciseId), [exerciseId]);
  const [media, setMedia] = useState<ExerciseMedia | undefined>();
  const [loading, setLoading] = useState(true);
  const player = useVideoPlayer(media?.videoUrl ? { uri: media.videoUrl } : null, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  useEffect(() => {
    if (!exercise) {
      setLoading(false);
      return;
    }
    let active = true;
    void loadExerciseMedia(exercise.id, exercise.name).then((result) => {
      if (active) {
        setMedia(result);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [exercise]);

  if (!exercise) {
    return <ScreenContainer className="px-5 pt-4"><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.title}>Exercise unavailable</Text></ScreenContainer>;
  }

  const guide = formGuides[exercise.muscleGroup];
  const primary = media?.primaryMuscles?.length ? media.primaryMuscles : [exercise.focus];

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back to workout</Text></Pressable>
      <Text style={styles.eyebrow}>{exercise.muscleGroup.toUpperCase()}</Text>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.subtitle}>{exercise.focus} · {exercise.equipment.join(", ")}</Text>

      {media?.videoUrl ? <VideoView player={player} style={styles.media} nativeControls allowsFullscreen /> : media?.imageUrl ? <Image source={{ uri: media.imageUrl }} style={styles.media} contentFit="contain" cachePolicy="disk" /> : <View style={styles.mediaPlaceholder}><IconSymbol name="figure.strengthtraining.traditional" size={48} color={mint} /><Text style={styles.placeholderText}>{loading ? "Loading demonstration…" : "No licensed demonstration is available yet."}</Text></View>}

      <View style={styles.muscleCard}>
        <Text style={styles.cardEyebrow}>MUSCLES USED</Text>
        <Text style={styles.musclePrimary}>Primary: {primary.join(", ")}</Text>
        {media?.secondaryMuscles?.length ? <Text style={styles.muscleSecondary}>Secondary: {media.secondaryMuscles.join(", ")}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How to perform it</Text>
        {media?.description ? <Text style={styles.description}>{media.description}</Text> : null}
        {guide.steps.map((step, index) => <View key={step} style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><Text style={styles.stepText}>{step}</Text></View>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Common mistakes</Text>
        {guide.mistakes.map((mistake) => <Text key={mistake} style={styles.mistake}>• {mistake}</Text>)}
      </View>

      <Text style={styles.safety}>Demonstrations are general guidance, not individual coaching. Use a manageable load and range. Stop for sharp pain, dizziness, chest pain, or unusual symptoms.</Text>
      {media?.attribution ? <Text style={styles.attribution}>{media.attribution}</Text> : null}
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32, gap: 15 },
  back: { color: mint, fontSize: 14, fontWeight: "800" },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 13, lineHeight: 18 },
  media: { width: "100%", height: 240, borderRadius: 20, backgroundColor: "#111513" },
  mediaPlaceholder: { height: 220, borderRadius: 20, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#354536", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  placeholderText: { color: muted, fontSize: 12, textAlign: "center" },
  muscleCard: { backgroundColor: "#2C3321", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#4D653D", gap: 6 },
  cardEyebrow: { color: mint, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  musclePrimary: { color: "#F4F7F0", fontSize: 15, fontWeight: "800" },
  muscleSecondary: { color: muted, fontSize: 12 },
  card: { backgroundColor: "#1B231D", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#2D392E", gap: 11 },
  cardTitle: { color: "#F4F7F0", fontSize: 17, fontWeight: "900" },
  description: { color: muted, fontSize: 12, lineHeight: 18 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNumber: { width: 26, height: 26, borderRadius: 9, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: mint, fontSize: 11, fontWeight: "900" },
  stepText: { color: "#DCE5D8", fontSize: 12, lineHeight: 18, flex: 1 },
  mistake: { color: muted, fontSize: 12, lineHeight: 18 },
  safety: { color: "#F7CF77", fontSize: 11, lineHeight: 17 },
  attribution: { color: "#718071", fontSize: 9, lineHeight: 14 },
});
