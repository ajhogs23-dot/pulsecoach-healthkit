import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { exercisesFor, type ExerciseLibraryItem, type MuscleGroup } from "@/lib/exercise-library";
import { loadCompletedWorkouts, saveActiveWorkoutPlan, type CompletedWorkout, type WorkoutExercise } from "@/lib/workout-log";
import { durationForReadiness, personaliseExercises, setsForReadiness, type Readiness } from "@/lib/workout-personalisation";
import { conflictsWithLimitation } from "@/lib/workout-personalisation";
import { limitationText, loadMovementLimitations, saveMovementLimitation, type MovementLimitation } from "@/lib/movement-limitations";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const muscleGroups: MuscleGroup[] = ["Full body", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio"];
const durations = [20, 30, 45, 60];
const limitationSuggestions = [
  "Shoulder pain",
  "Knee pain",
  "Lower back pain",
  "Wrist pain",
  "Elbow pain",
  "Hip pain",
  "Ankle pain",
  "Foot pain",
];
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

function pickExercises(focus: MuscleGroup, duration: number, profile: ProfilePreferences, history: CompletedWorkout[], limitation = "") {
  const available = personaliseExercises(exercisesFor(focus, profile.trainingSetup), history, limitation);
  const count = Math.min(available.length, focus === "Cardio" ? Math.max(1, Math.round(duration / 15)) : Math.max(3, Math.round(duration / 8)));
  if (focus !== "Full body") return available.slice(0, count);

  const groups = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const;
  const selected: ExerciseLibraryItem[] = [];
  let round = 0;
  while (selected.length < count) {
    for (const group of groups) {
      const choices = available.filter((exercise) => exercise.muscleGroup === group);
      if (choices.length && selected.length < count) selected.push(choices[round % choices.length]);
    }
    round += 1;
  }
  return selected;
}

function toWorkoutExercise(item: ExerciseLibraryItem, profile: ProfilePreferences, duration: number, exerciseCount: number, readiness: Readiness): WorkoutExercise {
  if (item.muscleGroup === "Cardio") {
    const minutes = Math.max(5, Math.floor(duration / Math.max(1, exerciseCount)));
    return { name: item.name, focus: item.focus, sets: 1, repTarget: `${minutes} min`, tracking: "time" };
  }
  return {
    name: item.name,
    focus: item.focus,
    sets: setsForReadiness(profile.goal === "Maintain health" ? 2 : 3, readiness),
    repTarget: profile.goal === "Build strength" ? "8–10" : "10–12",
    tracking: "reps",
  };
}

export default function WorkoutScreen() {
  const { focus: requestedFocus } = useLocalSearchParams<{ focus?: string }>();
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [focus, setFocus] = useState<MuscleGroup>("Full body");
  const [duration, setDuration] = useState(30);
  const [selected, setSelected] = useState<ExerciseLibraryItem[]>([]);
  const [focusOpen, setFocusOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<Readiness>("Ready");
  const [limitationSearch, setLimitationSearch] = useState("");
  const [limitationsOpen, setLimitationsOpen] = useState(false);
  const [otherLimitationOpen, setOtherLimitationOpen] = useState(false);
  const [savedLimitations, setSavedLimitations] = useState<MovementLimitation[]>([]);
  const activeLimitationText = limitationText(savedLimitations);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadProfilePreferences(userKey), loadCompletedWorkouts(userKey), loadMovementLimitations(userKey)]).then(([savedProfile, savedHistory, savedItems]) => {
      if (!active) return;
      const initialFocus = typeof requestedFocus === "string" && muscleGroups.includes(requestedFocus as MuscleGroup)
        ? requestedFocus as MuscleGroup
        : "Full body";
      setProfile(savedProfile);
      setHistory(savedHistory);
      setSavedLimitations(savedItems);
      const savedText = limitationText(savedItems);
      setFocus(initialFocus);
      setSelected(pickExercises(initialFocus, 30, savedProfile, savedHistory, savedText));
    });
    return () => { active = false; };
  }, [requestedFocus, userKey]));

  const chooseFocus = (nextFocus: MuscleGroup) => {
    setFocus(nextFocus);
    setFocusOpen(false);
    setEditingIndex(null);
    setSelected(pickExercises(nextFocus, durationForReadiness(duration, readiness), profile, history, activeLimitationText));
  };

  const chooseDuration = (minutes: number) => {
    setDuration(minutes);
    setEditingIndex(null);
    setSelected(pickExercises(focus, durationForReadiness(minutes, readiness), profile, history, activeLimitationText));
  };

  const updateReadiness = (value: Readiness) => {
    setReadiness(value);
    setEditingIndex(null);
    setSelected(pickExercises(focus, durationForReadiness(duration, value), profile, history, activeLimitationText));
  };

  const updateLimitation = (value: string) => {
    setLimitationSearch(value);
  };

  const addSuggestedLimitation = async (area: string) => {
    if (savedLimitations.some((item) => item.area.toLowerCase() === area.toLowerCase())) {
      setLimitationSearch("");
      return;
    }
    const next = await saveMovementLimitation(userKey, area, "");
    setSavedLimitations(next);
    setLimitationSearch("");
    setLimitationsOpen(false);
    setOtherLimitationOpen(false);
    setEditingIndex(null);
    setSelected(pickExercises(focus, durationForReadiness(duration, readiness), profile, history, limitationText(next)));
  };

  const replaceExercise = (index: number, replacement: ExerciseLibraryItem) => {
    setSelected((current) => current.map((item, itemIndex) => itemIndex === index ? replacement : item));
    setEditingIndex(null);
  };

  const startSession = async () => {
    const recommendedDuration = durationForReadiness(duration, readiness);
    const exercises = selected.map((item) => toWorkoutExercise(item, profile, recommendedDuration, selected.length, readiness));
    await saveActiveWorkoutPlan(userKey, {
      title: focus === "Full body" ? "Full-body workout" : `${focus} workout`,
      focus,
      durationMinutes: recommendedDuration,
      exercises,
    });
    router.push("/session");
  };

  const candidates = personaliseExercises(exercisesFor(focus, profile.trainingSetup), history, activeLimitationText);
  const matchingLimitations = limitationSuggestions.filter((suggestion) =>
    !savedLimitations.some((item) => item.area.toLowerCase() === suggestion.toLowerCase()) &&
    (!limitationSearch.trim() || suggestion.toLowerCase().includes(limitationSearch.trim().toLowerCase())),
  );
  const recommendedDuration = durationForReadiness(duration, readiness);
  const latest = [...history].reverse().slice(0, 3);

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>WORKOUT BUILDER</Text>
      <Text style={styles.title}>What do you want to train?</Text>
      <Text style={styles.subtitle}>Choose a body area and session length, then swap any exercise before you begin.</Text>
      <Pressable style={styles.libraryButton} onPress={() => router.push("/exercises" as any)}><View style={styles.libraryIcon}><IconSymbol name="square.grid.2x2.fill" size={22} color={mint} /></View><View style={styles.flex}><Text style={styles.libraryTitle}>Explore exercise library</Text><Text style={styles.libraryCopy}>Browse every exercise by muscle group or equipment</Text></View><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>

      <Text style={styles.label}>TODAY’S FOCUS</Text>
      <Pressable style={styles.dropdown} onPress={() => setFocusOpen((open) => !open)}><Text style={styles.dropdownText}>{focus}</Text><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>
      {focusOpen ? <View style={styles.dropdownMenu}>{muscleGroups.map((group) => <Pressable key={group} onPress={() => chooseFocus(group)} style={[styles.dropdownOption, focus === group && styles.dropdownOptionActive]}><Text style={[styles.dropdownOptionText, focus === group && styles.dropdownOptionTextActive]}>{group}</Text></Pressable>)}</View> : null}

      <Text style={styles.label}>HOW LONG DO YOU WANT TO TRAIN?</Text>
      <View style={styles.durationRow}>{durations.map((minutes) => <Pressable key={minutes} onPress={() => chooseDuration(minutes)} style={[styles.duration, duration === minutes && styles.durationActive]}><Text style={[styles.durationText, duration === minutes && styles.durationTextActive]}>{minutes} min</Text></Pressable>)}</View>

      <Text style={styles.label}>HOW READY DO YOU FEEL?</Text>
      <View style={styles.durationRow}>{(["Low", "Okay", "Ready"] as Readiness[]).map((value) => <Pressable key={value} onPress={() => updateReadiness(value)} style={[styles.duration, readiness === value && styles.durationActive]}><Text style={[styles.durationText, readiness === value && styles.durationTextActive]}>{value}</Text></Pressable>)}</View>

      <View style={styles.summary}><View style={styles.flex}><Text style={styles.summaryLabel}>YOUR SESSION</Text><Text style={styles.summaryTitle}>{focus === "Full body" ? "Full-body workout" : `${focus} workout`}</Text><Text style={styles.summaryMeta}>{recommendedDuration} min · {selected.length} exercises · {profile.trainingSetup} · {readiness}</Text>{readiness === "Low" ? <Text style={styles.adjustment}>Reduced duration and sets for low readiness.</Text> : null}</View><View style={styles.circle}><Text style={styles.circleText}>{recommendedDuration}</Text><Text style={styles.circleLabel}>MIN</Text></View></View>

      <View style={styles.sectionRow}><Text style={styles.section}>Selected exercises</Text><Text style={styles.available}>{candidates.length} choices</Text></View>
      {selected.map((exercise, index) => <View key={`${exercise.id}-${index}`}>
        <Pressable style={[styles.exercise, conflictsWithLimitation(exercise, activeLimitationText) && styles.exerciseWarning]} onPress={() => router.push(`/exercise/${exercise.id}` as any)}>
          <View style={styles.num}><Text style={styles.numText}>{index + 1}</Text></View>
          <View style={styles.flex}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{toWorkoutExercise(exercise, profile, recommendedDuration, selected.length, readiness).tracking === "time" ? toWorkoutExercise(exercise, profile, recommendedDuration, selected.length, readiness).repTarget : `${toWorkoutExercise(exercise, profile, recommendedDuration, selected.length, readiness).sets} sets · ${toWorkoutExercise(exercise, profile, recommendedDuration, selected.length, readiness).repTarget} reps`}</Text><Text style={styles.exerciseFocus}>{exercise.focus}</Text>{conflictsWithLimitation(exercise, activeLimitationText) ? <Text style={styles.exerciseWarningText}>⚠ Heavily involves an area in your saved limitations. Modify, swap, or stop if painful.</Text> : null}</View>
          <View style={styles.exerciseActions}><Text style={styles.guide}>Guide</Text><Pressable onPress={(event) => { event.stopPropagation(); setEditingIndex(editingIndex === index ? null : index); }}><Text style={styles.swap}>Change</Text></Pressable></View>
        </Pressable>
        {editingIndex === index ? <View style={styles.choiceList}><Text style={styles.choiceTitle}>Choose another {focus.toLowerCase()} exercise</Text>{candidates.filter((candidate) => !selected.some((item, selectedIndex) => selectedIndex !== index && item.id === candidate.id)).map((candidate) => <Pressable key={candidate.id} style={styles.choiceRow} onPress={() => replaceExercise(index, candidate)}><Text style={styles.choiceText}>{candidate.name}</Text><Text style={styles.choiceMeta}>{candidate.focus}</Text></Pressable>)}</View> : null}
      </View>)}

      <Pressable disabled={!selected.length} style={({ pressed }) => [styles.start, !selected.length && styles.disabled, pressed && selected.length > 0 && styles.pressed]} onPress={() => void startSession()}><IconSymbol name="play.fill" size={18} color="#111513" /><Text style={styles.startText}>Start this workout</Text></Pressable>

      <Text style={styles.section}>Recent workouts</Text>
      {latest.length ? latest.map((workout) => <View key={workout.id} style={styles.historyCard}><View style={styles.flex}><Text style={styles.historyTitle}>{workout.title}</Text><Text style={styles.historyMeta}>{new Date(workout.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {workout.exercises.reduce((total, exercise) => total + exercise.completedSets.length, 0)} sets</Text></View><IconSymbol name="checkmark" size={18} color={mint} /></View>) : <Text style={styles.empty}>Complete your first logged workout to begin your history.</Text>}

      <Text style={styles.label}>PAIN OR MOVEMENT LIMITATION</Text>
      <Pressable style={styles.limitationPicker} onPress={() => { setOtherLimitationOpen(false); setLimitationSearch(""); setLimitationsOpen(true); }}><Text style={styles.limitationPickerText}>Add pain or limitation</Text><Text style={styles.limitationPickerPlus}>＋</Text></Pressable>
      {savedLimitations.length ? <View style={styles.savedLimitations}>{savedLimitations.map((item) => <View key={item.id} style={styles.savedChip}><Text style={styles.savedChipText}>{item.area}</Text></View>)}</View> : null}
      <Pressable onPress={() => router.push("/injuries" as any)}><Text style={styles.manageLimitations}>Manage saved limitations</Text></Pressable>
      <Text style={styles.note}>Exercise choice should respect your ability, injuries, and available equipment. Stop for sharp pain, dizziness, or unusual symptoms.</Text>
    </ScrollView>
    <Modal visible={limitationsOpen} transparent animationType="slide" onRequestClose={() => setLimitationsOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setLimitationsOpen(false)}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{otherLimitationOpen ? "Search or add another limitation" : "Choose pain or limitation"}</Text>
          {otherLimitationOpen ? <>
            <TextInput autoFocus value={limitationSearch} onChangeText={updateLimitation} placeholder="e.g. neck pain or tight hamstring" placeholderTextColor="#718071" style={styles.limitationInput} accessibilityLabel="Search or add another limitation" />
            {matchingLimitations.map((suggestion) => <Pressable key={suggestion} style={styles.modalOption} onPress={() => void addSuggestedLimitation(suggestion)}><Text style={styles.modalOptionText}>{suggestion}</Text><Text style={styles.modalPlus}>＋</Text></Pressable>)}
            {limitationSearch.trim() && !limitationSuggestions.some((suggestion) => suggestion.toLowerCase() === limitationSearch.trim().toLowerCase()) ? <Pressable style={styles.customSave} onPress={() => void addSuggestedLimitation(limitationSearch.trim())}><Text style={styles.customSaveText}>Save “{limitationSearch.trim()}”</Text></Pressable> : null}
            <Pressable style={styles.modalBack} onPress={() => { setOtherLimitationOpen(false); setLimitationSearch(""); }}><Text style={styles.modalBackText}>Back to common options</Text></Pressable>
          </> : <>
            {limitationSuggestions.filter((suggestion) => !savedLimitations.some((item) => item.area.toLowerCase() === suggestion.toLowerCase())).map((suggestion) => <Pressable key={suggestion} style={styles.modalOption} onPress={() => void addSuggestedLimitation(suggestion)}><Text style={styles.modalOptionText}>{suggestion}</Text><Text style={styles.modalPlus}>＋</Text></Pressable>)}
            <Pressable style={styles.otherOption} onPress={() => setOtherLimitationOpen(true)}><Text style={styles.otherOptionText}>Other</Text><Text style={styles.modalPlus}>›</Text></Pressable>
          </>}
        </Pressable>
      </Pressable>
    </Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 14 },
  flex: { flex: 1 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  label: { color: muted, fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 4 },
  limitationInput: { backgroundColor: "#111513", borderRadius: 13, borderWidth: 1, borderColor: "#3B4A3B", padding: 13, color: "#F4F7F0" },
  limitationPicker: { backgroundColor: "#111513", borderRadius: 13, borderWidth: 1, borderColor: "#3B4A3B", padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  limitationPickerText: { color: "#F4F7F0", fontSize: 13, fontWeight: "700" },
  limitationPickerPlus: { color: mint, fontSize: 21, fontWeight: "800" },
  savedLimitations: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  savedChip: { backgroundColor: "#2A241A", borderRadius: 99, borderWidth: 1, borderColor: "#705D38", paddingHorizontal: 10, paddingVertical: 6 },
  savedChipText: { color: "#F7CF77", fontSize: 10, fontWeight: "800" },
  manageLimitations: { color: mint, fontSize: 11, fontWeight: "800", marginTop: -6 },
  safety: { color: "#F7CF77", fontSize: 11, lineHeight: 16 },
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
  adjustment: { color: mint, fontSize: 10, fontWeight: "800", marginTop: 6 },
  circle: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: mint, alignItems: "center", justifyContent: "center" },
  circleText: { color: "#F4F7F0", fontSize: 21, fontWeight: "800" },
  circleLabel: { color: mint, fontSize: 9, fontWeight: "800" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { color: "#F4F7F0", fontSize: 18, fontWeight: "800", marginTop: 4 },
  available: { color: mint, fontSize: 11, fontWeight: "800" },
  exercise: { backgroundColor: "#1B231D", borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#263128" },
  libraryButton: { backgroundColor: "#1B231D", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#4D653D" },
  libraryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  libraryTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "900" },
  libraryCopy: { color: muted, fontSize: 10, marginTop: 3 },
  exerciseWarning: { borderColor: "#C9953E", backgroundColor: "#262117" },
  exerciseWarningText: { color: "#F7CF77", fontSize: 10, lineHeight: 14, fontWeight: "700", marginTop: 7 },
  num: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  numText: { color: mint, fontWeight: "800" },
  exerciseName: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" },
  exerciseMeta: { color: muted, fontSize: 11, marginTop: 4 },
  exerciseFocus: { color: mint, fontSize: 10, fontWeight: "700", marginTop: 5 },
  exerciseActions: { alignItems: "flex-end", gap: 8 },
  guide: { color: "#87C7E8", fontSize: 10, fontWeight: "900" },
  swap: { color: mint, fontSize: 10, fontWeight: "900" },
  choiceList: { backgroundColor: "#202A21", borderRadius: 15, padding: 12, gap: 6, borderWidth: 1, borderColor: "#354536", marginTop: 5 },
  choiceTitle: { color: mint, fontSize: 11, fontWeight: "900", marginBottom: 3 },
  choiceRow: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#354536" },
  choiceText: { color: "#F4F7F0", fontSize: 12, fontWeight: "800" },
  choiceMeta: { color: muted, fontSize: 10, marginTop: 2 },
  start: { backgroundColor: mint, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  startText: { color: "#111513", fontWeight: "800", fontSize: 15 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  historyCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1B231D", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#263128" },
  historyTitle: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  historyMeta: { color: muted, fontSize: 11, marginTop: 3 },
  empty: { color: muted, fontSize: 12, lineHeight: 17 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#171D18", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 34, gap: 6, borderWidth: 1, borderColor: "#354536", maxHeight: "88%" },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#566256", alignSelf: "center", marginBottom: 8 },
  modalTitle: { color: "#F4F7F0", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalOption: { minHeight: 47, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#354536", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalOptionText: { color: "#F4F7F0", fontSize: 14, fontWeight: "700" },
  modalPlus: { color: mint, fontSize: 19, fontWeight: "800" },
  otherOption: { minHeight: 49, marginTop: 5, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#202A21", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  otherOptionText: { color: mint, fontSize: 14, fontWeight: "800" },
  customSave: { backgroundColor: mint, borderRadius: 13, padding: 14, alignItems: "center", marginTop: 8 },
  customSaveText: { color: "#111513", fontWeight: "800" },
  modalBack: { padding: 13, alignItems: "center", marginTop: 3 },
  modalBackText: { color: muted, fontSize: 12, fontWeight: "700" },
});
