import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { exercisesFor, type ExerciseLibraryItem, type MuscleGroup } from "@/lib/exercise-library";
import { loadCompletedWorkouts, saveActiveWorkoutPlan, type CompletedWorkout, type WorkoutExercise } from "@/lib/workout-log";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const muscleGroups: MuscleGroup[] = ["Full body", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];
const durations = [20, 30, 45, 60];
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

function pickExercises(focus: MuscleGroup, duration: number, profile: ProfilePreferences, offset = 0) {
  const available = exercisesFor(focus, profile.trainingSetup);
  const count = Math.min(available.length, Math.max(3, Math.round(duration / 8)));
  if (focus !== "Full body") return Array.from({ length: count }, (_, index) => available[(index + offset) % available.length]);

  const groups = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const;
  const selected: ExerciseLibraryItem[] = [];
  let round = 0;
  while (selected.length < count) {
    for (const group of groups) {
      const choices = available.filter((exercise) => exercise.muscleGroup === group);
      if (choices.length && selected.length < count) selected.push(choices[(round + offset) % choices.length]);
    }
    round += 1;
  }
  return selected;
}

function toWorkoutExercise(item: ExerciseLibraryItem, profile: ProfilePreferences): WorkoutExercise {
  return {
    name: item.name,
    focus: item.focus,
    sets: profile.goal === "Maintain health" ? 2 : 3,
    repTarget: profile.goal === "Build strength" ? "8–10" : "10–12",
  };
}

export default function WorkoutScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [focus, setFocus] = useState<MuscleGroup>("Full body");
  const [duration, setDuration] = useState(30);
  const [selected, setSelected] = useState<ExerciseLibraryItem[]>([]);
  const [focusOpen, setFocusOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadProfilePreferences(userKey), loadCompletedWorkouts(userKey)]).then(([savedProfile, savedHistory]) => {
      if (!active) return;
      setProfile(savedProfile);
      setHistory(savedHistory);
      setSelected(pickExercises("Full body", 30, savedProfile, savedHistory.length));
    });
    return () => { active = false; };
  }, [userKey]));

  const chooseFocus = (nextFocus: MuscleGroup) => {
    setFocus(nextFocus);
    setFocusOpen(false);
    setEditingIndex(null);
    setSelected(pickExercises(nextFocus, duration, profile, history.length));
  };

  const chooseDuration = (minutes: number) => {
    setDuration(minutes);
    setEditingIndex(null);
    setSelected(pickExercises(focus, minutes, profile, history.length));
  };

  const replaceExercise = (index: number, replacement: ExerciseLibraryItem) => {
    setSelected((current) => current.map((item, itemIndex) => itemIndex === index ? replacement : item));
    setEditingIndex(null);
  };

  const startSession = async () => {
    const exercises = selected.map((item) => toWorkoutExercise(item, profile));
    await saveActiveWorkoutPlan(userKey, {
      title: focus === "Full body" ? "Full-body workout" : `${focus} workout`,
      focus,
      durationMinutes: duration,
      exercises,
    });
    router.push("/session");
  };

  const candidates = exercisesFor(focus, profile.trainingSetup);
  const latest = [...history].reverse().slice(0, 3);

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>WORKOUT BUILDER</Text>
      <Text style={styles.title}>What do you want to train?</Text>
      <Text style={styles.subtitle}>Choose a body area and session length, then swap any exercise before you begin.</Text>

      <Text style={styles.label}>TODAY’S FOCUS</Text>
      <Pressable style={styles.dropdown} onPress={() => setFocusOpen((open) => !open)}><Text style={styles.dropdownText}>{focus}</Text><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>
      {focusOpen ? <View style={styles.dropdownMenu}>{muscleGroups.map((group) => <Pressable key={group} onPress={() => chooseFocus(group)} style={[styles.dropdownOption, focus === group && styles.dropdownOptionActive]}><Text style={[styles.dropdownOptionText, focus === group && styles.dropdownOptionTextActive]}>{group}</Text></Pressable>)}</View> : null}

      <Text style={styles.label}>HOW LONG DO YOU WANT TO TRAIN?</Text>
      <View style={styles.durationRow}>{durations.map((minutes) => <Pressable key={minutes} onPress={() => chooseDuration(minutes)} style={[styles.duration, duration === minutes && styles.durationActive]}><Text style={[styles.durationText, duration === minutes && styles.durationTextActive]}>{minutes} min</Text></Pressable>)}</View>

      <View style={styles.summary}><View><Text style={styles.summaryLabel}>YOUR SESSION</Text><Text style={styles.summaryTitle}>{focus === "Full body" ? "Full-body workout" : `${focus} workout`}</Text><Text style={styles.summaryMeta}>{duration} min · {selected.length} exercises · {profile.trainingSetup}</Text></View><View style={styles.circle}><Text style={styles.circleText}>{duration}</Text><Text style={styles.circleLabel}>MIN</Text></View></View>

      <View style={styles.sectionRow}><Text style={styles.section}>Selected exercises</Text><Text style={styles.available}>{candidates.length} choices</Text></View>
      {selected.map((exercise, index) => <View key={`${exercise.id}-${index}`}>
        <Pressable style={styles.exercise} onPress={() => setEditingIndex(editingIndex === index ? null : index)}>
          <View style={styles.num}><Text style={styles.numText}>{index + 1}</Text></View>
          <View style={styles.flex}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{toWorkoutExercise(exercise, profile).sets} sets · {toWorkoutExercise(exercise, profile).repTarget} reps</Text><Text style={styles.exerciseFocus}>{exercise.focus}</Text></View>
          <Text style={styles.swap}>Change</Text>
        </Pressable>
        {editingIndex === index ? <View style={styles.choiceList}><Text style={styles.choiceTitle}>Choose another {focus.toLowerCase()} exercise</Text>{candidates.filter((candidate) => !selected.some((item, selectedIndex) => selectedIndex !== index && item.id === candidate.id)).map((candidate) => <Pressable key={candidate.id} style={styles.choiceRow} onPress={() => replaceExercise(index, candidate)}><Text style={styles.choiceText}>{candidate.name}</Text><Text style={styles.choiceMeta}>{candidate.focus}</Text></Pressable>)}</View> : null}
      </View>)}

      <Pressable style={({ pressed }) => [styles.start, pressed && styles.pressed]} onPress={() => void startSession()}><IconSymbol name="play.fill" size={18} color="#111513" /><Text style={styles.startText}>Start this workout</Text></Pressable>

      <Text style={styles.section}>Recent workouts</Text>
      {latest.length ? latest.map((workout) => <View key={workout.id} style={styles.historyCard}><View style={styles.flex}><Text style={styles.historyTitle}>{workout.title}</Text><Text style={styles.historyMeta}>{new Date(workout.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {workout.exercises.reduce((total, exercise) => total + exercise.completedSets.length, 0)} sets</Text></View><IconSymbol name="checkmark" size={18} color={mint} /></View>) : <Text style={styles.empty}>Complete your first logged workout to begin your history.</Text>}
      <Text style={styles.note}>Exercise choice should respect your ability, injuries, and available equipment. Stop for sharp pain, dizziness, or unusual symptoms.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 14 },
  flex: { flex: 1 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  label: { color: muted, fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 4 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1B231D", borderRadius: 15, padding: 15, borderWidth: 1, borderColor: mint },
  dropdownText: { color: "#F4F7F0", fontSize: 16, fontWeight: "900" },
  dropdownMenu: { backgroundColor: "#1B231D", borderRadius: 15, padding: 8, borderWidth: 1, borderColor: "#354536", gap: 3 },
  dropdownOption: { padding: 12, borderRadius: 10 },
  dropdownOptionActive: { backgroundColor: "#2C3B25" },
  dropdownOptionText: { color: muted, fontSize: 13, fontWeight: "700" },
  dropdownOptionTextActive: { color: mint },
  durationRow: { flexDirection: "row", gap: 7 },
  duration: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 12, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#2D392E" },
  durationActive: { backgroundColor: "#2C3B25", borderColor: mint },
  durationText: { color: muted, fontSize: 11, fontWeight: "800" },
  durationTextActive: { color: mint },
  summary: { backgroundColor: "#202A21", borderRadius: 21, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#354536" },
  summaryLabel: { color: mint, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  summaryTitle: { color: "#F4F7F0", fontSize: 21, fontWeight: "800", marginTop: 8 },
  summaryMeta: { color: muted, fontSize: 12, marginTop: 4 },
  circle: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: mint, alignItems: "center", justifyContent: "center" },
  circleText: { color: "#F4F7F0", fontSize: 21, fontWeight: "800" },
  circleLabel: { color: mint, fontSize: 9, fontWeight: "800" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { color: "#F4F7F0", fontSize: 18, fontWeight: "800", marginTop: 4 },
  available: { color: mint, fontSize: 11, fontWeight: "800" },
  exercise: { backgroundColor: "#1B231D", borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#263128" },
  num: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  numText: { color: mint, fontWeight: "800" },
  exerciseName: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" },
  exerciseMeta: { color: muted, fontSize: 11, marginTop: 4 },
  exerciseFocus: { color: mint, fontSize: 10, fontWeight: "700", marginTop: 5 },
  swap: { color: mint, fontSize: 10, fontWeight: "900" },
  choiceList: { backgroundColor: "#202A21", borderRadius: 15, padding: 12, gap: 6, borderWidth: 1, borderColor: "#354536", marginTop: 5 },
  choiceTitle: { color: mint, fontSize: 11, fontWeight: "900", marginBottom: 3 },
  choiceRow: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#354536" },
  choiceText: { color: "#F4F7F0", fontSize: 12, fontWeight: "800" },
  choiceMeta: { color: muted, fontSize: 10, marginTop: 2 },
  start: { backgroundColor: mint, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  startText: { color: "#111513", fontWeight: "800", fontSize: 15 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  historyCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1B231D", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#263128" },
  historyTitle: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  historyMeta: { color: muted, fontSize: 11, marginTop: 3 },
  empty: { color: muted, fontSize: 12, lineHeight: 17 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
});
