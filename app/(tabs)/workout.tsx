import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { getWorkoutPlan, loadCompletedWorkouts, type CompletedWorkout } from "@/lib/workout-log";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function WorkoutScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadProfilePreferences(userKey), loadCompletedWorkouts(userKey)]).then(([savedProfile, savedHistory]) => {
      if (!active) return;
      setProfile(savedProfile);
      setHistory(savedHistory);
    });
    return () => { active = false; };
  }, [userKey]));

  const plan = getWorkoutPlan(profile);
  const latest = [...history].reverse().slice(0, 3);

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>WORKOUT</Text>
      <Text style={styles.title}>Train with intention.</Text>
      <Text style={styles.subtitle}>Built for your {profile.goal.toLowerCase()} goal using {profile.trainingSetup.toLowerCase()}.</Text>

      <View style={styles.summary}>
        <View><Text style={styles.summaryLabel}>TODAY’S PLAN</Text><Text style={styles.summaryTitle}>{plan.title}</Text><Text style={styles.summaryMeta}>About {plan.durationMinutes} min · {profile.trainingSetup}</Text></View>
        <View style={styles.circle}><Text style={styles.circleText}>{plan.durationMinutes}</Text><Text style={styles.circleLabel}>MIN</Text></View>
      </View>

      <Pressable style={styles.profileLink} onPress={() => router.push("/profile")}><Text style={styles.profileLinkText}>Change goal or equipment in Profile ›</Text></Pressable>

      <Text style={styles.section}>Session plan</Text>
      {plan.exercises.map((exercise, index) => <View style={styles.exercise} key={exercise.name}>
        <View style={styles.num}><Text style={styles.numText}>{index + 1}</Text></View>
        <View style={styles.flex}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{exercise.sets} sets · {exercise.repTarget} reps</Text><Text style={styles.exerciseFocus}>{exercise.focus}</Text></View>
      </View>)}

      <Pressable style={({ pressed }) => [styles.start, pressed && styles.pressed]} onPress={() => router.push("/session")}>
        <IconSymbol name="play.fill" size={18} color="#111513" />
        <Text style={styles.startText}>Start and log session</Text>
      </Pressable>

      <View style={styles.mobility}><IconSymbol name="figure.flexibility" size={20} color={mint} /><View style={styles.flex}><Text style={styles.mobilityTitle}>Warm up first</Text><Text style={styles.mobilityCopy}>Begin with five minutes of easy movement and practise the first exercise with a lighter load.</Text></View></View>

      <Text style={styles.section}>Recent workouts</Text>
      {latest.length ? latest.map((workout) => <View key={workout.id} style={styles.historyCard}><View style={styles.flex}><Text style={styles.historyTitle}>{workout.title}</Text><Text style={styles.historyMeta}>{new Date(workout.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {workout.exercises.reduce((total, exercise) => total + exercise.completedSets.length, 0)} sets</Text></View><IconSymbol name="checkmark" size={18} color={mint} /></View>) : <Text style={styles.empty}>Complete your first logged workout to begin your history.</Text>}

      <Text style={styles.note}>Warm up gradually. Stop for sharp pain, dizziness, or unusual symptoms and seek appropriate professional advice.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 15 },
  flex: { flex: 1 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  summary: { backgroundColor: "#202A21", borderRadius: 21, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#354536" },
  summaryLabel: { color: mint, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  summaryTitle: { color: "#F4F7F0", fontSize: 21, fontWeight: "800", marginTop: 8 },
  summaryMeta: { color: muted, fontSize: 12, marginTop: 4 },
  circle: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: mint, alignItems: "center", justifyContent: "center" },
  circleText: { color: "#F4F7F0", fontSize: 22, fontWeight: "800", lineHeight: 23 },
  circleLabel: { color: mint, fontSize: 9, fontWeight: "800" },
  profileLink: { alignItems: "center", padding: 10 },
  profileLinkText: { color: mint, fontSize: 12, fontWeight: "800" },
  section: { color: "#F4F7F0", fontSize: 18, fontWeight: "800", marginTop: 4 },
  exercise: { backgroundColor: "#1B231D", borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#263128" },
  num: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  numText: { color: mint, fontWeight: "800" },
  exerciseName: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" },
  exerciseMeta: { color: muted, fontSize: 11, marginTop: 4 },
  exerciseFocus: { color: mint, fontSize: 10, fontWeight: "700", marginTop: 5 },
  start: { backgroundColor: mint, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  startText: { color: "#111513", fontWeight: "800", fontSize: 15 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  mobility: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#202A21", borderRadius: 17, padding: 14, borderWidth: 1, borderColor: "#354536" },
  mobilityTitle: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  mobilityCopy: { color: muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  historyCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1B231D", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#263128" },
  historyTitle: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  historyMeta: { color: muted, fontSize: 11, marginTop: 3 },
  empty: { color: muted, fontSize: 12, lineHeight: 17 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
});
