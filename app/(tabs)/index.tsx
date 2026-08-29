import { useCallback, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { loadHealthSnapshot, syncHealthData, type HealthSyncSnapshot } from "@/lib/healthkit";
import { loadManualActivities, summariseManualActivities, type ManualActivity } from "@/lib/manual-activities";
import { loadFoodLog, summariseFoodLog, todayFoodLog, type FoodLogEntry } from "@/lib/food-log";
import { calculateCalorieEstimate, DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { getWorkoutPlan, loadCompletedWorkouts, todayCompletedWorkouts, type CompletedWorkout } from "@/lib/workout-log";

const mint = "#B8F36B";
const bg = "#111513";
const surface = "#1B231D";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function HomeScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [health, setHealth] = useState<HealthSyncSnapshot | null>(null);
  const [manualActivities, setManualActivities] = useState<ManualActivity[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodLogEntry[]>([]);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [workouts, setWorkouts] = useState<CompletedWorkout[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [savedActivities, savedFood, savedProfile, savedWorkouts] = await Promise.all([
          loadManualActivities(userKey),
          loadFoodLog(userKey),
          loadProfilePreferences(userKey),
          loadCompletedWorkouts(userKey),
        ]);
        if (active) {
          setManualActivities(savedActivities);
          setFoodEntries(savedFood);
          setProfile(savedProfile);
          setWorkouts(savedWorkouts);
        }
        const cached = await loadHealthSnapshot(userKey);
        if (active) setHealth(cached);
        if (cached.status === "connected" || cached.lastSyncedAt) {
          const synced = await syncHealthData(userKey, new Date(), cached.preferences);
          if (active) setHealth(synced);
        }
      } catch {
        if (active) setHealth(null);
      }
    };
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [userKey]));

  const summary = health?.summary;
  const connected = health?.status === "connected" || Boolean(health?.lastSyncedAt);
  const manualSummary = summariseManualActivities(manualActivities);
  const totalActiveEnergy = (summary?.activeEnergyKcal ?? 0) + manualSummary.calories;
  const hasActiveEnergy = summary?.activeEnergyKcal !== undefined || manualSummary.calories > 0;
  const nutritionSummary = summariseFoodLog(foodEntries);
  const foodsLoggedToday = todayFoodLog(foodEntries).length;
  const calorieTarget = profile.calorieTarget ?? calculateCalorieEstimate(profile)?.recommendedCalories;
  const calorieRemaining = calorieTarget === undefined ? undefined : calorieTarget - nutritionSummary.calories;
  const calorieProgress = calorieTarget ? Math.min(100, Math.max(0, nutritionSummary.calories / calorieTarget * 100)) : 0;
  const workoutsToday = todayCompletedWorkouts(workouts);
  const workoutPlan = getWorkoutPlan(profile);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.name.trim().split(/\s+/)[0] || user?.name?.trim().split(/\s+/)[0] || "Andy";
  const dateLabel = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "short" }).format(now).toUpperCase();
  return (
    <ScreenContainer containerClassName="bg-background" className="px-5 pt-3">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{dateLabel}</Text>
            <Text style={styles.title}>{greeting}, {firstName}</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => router.push("/profile")}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>YOUR COACHING PULSE</Text>
              <Text style={styles.heroTitle}>{["Stay steady.", "You’re building momentum.", "Show up for yourself.", "One good choice at a time.", "Strong habits compound."][new Date().getMinutes() % 5]}</Text>
              <Text style={styles.heroCopy}>Small choices today keep your week moving forward.</Text>
            </View>
            <View style={styles.pulseMark}><Text style={styles.pulseText}>⌁</Text></View>
          </View>
          <Pressable style={({ pressed }) => [styles.talkButton, pressed && styles.pressed]} onPress={() => router.push("/coach")}>
            <IconSymbol name="mic.fill" size={21} color={bg} />
            <Text style={styles.talkText}>Talk to PulseCoach</Text>
            <IconSymbol name="chevron.right" size={20} color={bg} />
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today at a glance</Text>
          <Pressable onPress={() => router.push("/activity" as any)}><Text style={styles.link}>View activity</Text></Pressable>
        </View>
        <View style={styles.metricGrid}>
          <Metric icon="figure.walk" label="Movement" value={summary?.steps === undefined ? "—" : Math.round(summary.steps).toLocaleString("en-AU")} note={connected ? "steps from Apple Health" : "Connect Apple Health"} onPress={() => router.push("/activity" as any)} />
          <Metric icon="flame.fill" label="Active energy" value={hasActiveEnergy ? `${Math.round(totalActiveEnergy)} kcal` : "—"} note={manualSummary.calories > 0 ? "Health + manual entries" : connected ? "from Apple Health" : "No data yet"} onPress={() => router.push("/activity" as any)} />
          <Metric icon="fork.knife" label="Nutrition" value={foodsLoggedToday ? `${Math.round(nutritionSummary.calories)} kcal` : "Start"} note={foodsLoggedToday ? `${foodsLoggedToday} food entr${foodsLoggedToday === 1 ? "y" : "ies"} today` : "Build your first meal"} onPress={() => router.push("/nutrition")} />
          <Metric icon="dumbbell.fill" label="Training" value={workoutsToday.length ? "Done" : "Ready"} note={workoutsToday.length ? `${workoutsToday.length} workout${workoutsToday.length === 1 ? "" : "s"} completed` : `${workoutPlan.durationMinutes} min ${workoutPlan.title.toLowerCase()}`} onPress={() => router.push("/workout")} />
        </View>

        {calorieTarget !== undefined ? <Pressable style={styles.calorieCard} onPress={() => router.push("/nutrition")}>
          <View style={styles.calorieTop}>
            <View>
              <Text style={styles.calorieEyebrow}>DAILY CALORIE TARGET</Text>
              <Text style={styles.calorieValue}>{Math.round(nutritionSummary.calories).toLocaleString("en-AU")} <Text style={styles.calorieTarget}>/ {Math.round(calorieTarget).toLocaleString("en-AU")} kcal</Text></Text>
            </View>
            <Text style={calorieRemaining !== undefined && calorieRemaining < 0 ? styles.calorieOver : styles.calorieRemaining}>{calorieRemaining === undefined ? "—" : calorieRemaining >= 0 ? `${Math.round(calorieRemaining).toLocaleString("en-AU")} left` : `${Math.round(Math.abs(calorieRemaining)).toLocaleString("en-AU")} over`}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${calorieProgress}%` as `${number}%` }]} /></View>
          <Text style={styles.calorieCopy}>{foodsLoggedToday ? `${foodsLoggedToday} food entr${foodsLoggedToday === 1 ? "y" : "ies"} logged today` : "Log your first food to start tracking"}</Text>
        </Pressable> : null}

        {!connected && <Pressable style={styles.healthBanner} onPress={() => router.push("/health")}>
          <View style={styles.healthIcon}><IconSymbol name="heart.text.square.fill" size={22} color={mint} /></View>
          <View style={styles.healthBody}><Text style={styles.healthTitle}>Connect Apple Health</Text><Text style={styles.healthCopy}>Use your movement and workout data for more useful coaching.</Text></View>
          <IconSymbol name="chevron.right" size={20} color={muted} />
        </Pressable>}

        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Next best actions</Text></View>
        <Pressable style={styles.actionCard} onPress={() => router.push("/nutrition")}>
          <View style={[styles.actionIcon, { backgroundColor: "#2C3321" }]}><IconSymbol name="fork.knife" size={22} color={mint} /></View>
          <View style={styles.actionBody}><Text style={styles.actionTitle}>Choose a satisfying dinner</Text><Text style={styles.actionCopy}>Tell me what you have in the kitchen.</Text></View>
          <IconSymbol name="chevron.right" size={20} color={muted} />
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push("/workout")}>
          <View style={[styles.actionIcon, { backgroundColor: "#222D35" }]}><IconSymbol name="dumbbell.fill" size={22} color="#87C7E8" /></View>
          <View style={styles.actionBody}><Text style={styles.actionTitle}>Plan your training</Text><Text style={styles.actionCopy}>A focused session based on your goal.</Text></View>
          <IconSymbol name="chevron.right" size={20} color={muted} />
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push("/activity" as any)}><View style={[styles.actionIcon, { backgroundColor: "#2B313B" }]}><IconSymbol name="chart.bar.fill" size={22} color="#87C7E8" /></View><View style={styles.actionBody}><Text style={styles.actionTitle}>Review today’s activity</Text><Text style={styles.actionCopy}>Steps, calories burned, and manual entries.</Text></View><IconSymbol name="chevron.right" size={20} color={muted} /></Pressable><Text style={styles.disclaimer}>PulseCoach offers general wellness guidance, not medical advice. Listen to your body and consult a qualified professional for health concerns.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Metric({ icon, label, value, note, onPress }: { icon: any; label: string; value: string; note: string; onPress: () => void }) {
  return <Pressable style={({ pressed }) => [styles.metric, pressed && styles.pressed]} onPress={onPress}><IconSymbol name={icon} size={20} color={mint} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricNote}>{note}</Text></Pressable>;
}

const styles = StyleSheet.create({ calorieCard: { backgroundColor: "#202A21", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#4D653D", gap: 10 }, calorieTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, calorieEyebrow: { color: mint, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, calorieValue: { color: "#F4F7F0", fontSize: 23, fontWeight: "900", marginTop: 5 }, calorieTarget: { color: muted, fontSize: 13, fontWeight: "700" }, calorieRemaining: { color: mint, fontSize: 14, fontWeight: "900" }, calorieOver: { color: "#F49AB5", fontSize: 14, fontWeight: "900" }, progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: "#111513" }, progressFill: { height: 8, borderRadius: 4, backgroundColor: mint }, calorieCopy: { color: muted, fontSize: 11 }, content: { paddingBottom: 32, gap: 18 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }, eyebrow: { color: muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }, title: { color: "#F4F7F0", fontSize: 27, fontWeight: "800", marginTop: 5, letterSpacing: -0.5 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: mint, alignItems: "center", justifyContent: "center" }, avatarText: { color: bg, fontSize: 17, fontWeight: "800" }, heroCard: { backgroundColor: surface, borderRadius: 26, padding: 20, gap: 22, borderWidth: 1, borderColor: "#2D392E" }, heroTop: { flexDirection: "row", justifyContent: "space-between" }, heroEyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, heroTitle: { color: "#F4F7F0", fontSize: 31, fontWeight: "800", marginTop: 8, letterSpacing: -0.8 }, heroCopy: { color: muted, fontSize: 14, lineHeight: 20, marginTop: 5, maxWidth: 230 }, pulseMark: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#273322", alignItems: "center", justifyContent: "center" }, pulseText: { color: mint, fontSize: 39, fontWeight: "300", transform: [{ rotate: "-12deg" }] }, talkButton: { backgroundColor: mint, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }, talkText: { color: bg, fontSize: 15, fontWeight: "800", flex: 1 }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }, sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 }, sectionTitle: { color: "#F4F7F0", fontSize: 18, fontWeight: "800" }, link: { color: mint, fontSize: 13, fontWeight: "700" }, metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "48.5%", minHeight: 128, backgroundColor: surface, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#263128" }, metricLabel: { color: muted, fontSize: 12, fontWeight: "700", marginTop: 12 }, metricValue: { color: "#F4F7F0", fontSize: 25, fontWeight: "800", marginTop: 7 }, metricNote: { color: muted, fontSize: 11, lineHeight: 15, marginTop: 3 }, healthBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#202A21", borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: "#354536" }, healthIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#2B3B27", alignItems: "center", justifyContent: "center" }, healthBody: { flex: 1 }, healthTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" }, healthCopy: { color: muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, actionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: surface, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#263128" }, actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, actionBody: { flex: 1 }, actionTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" }, actionCopy: { color: muted, fontSize: 12, marginTop: 3 }, disclaimer: { color: "#718071", fontSize: 11, lineHeight: 16, marginTop: 4 }
});
