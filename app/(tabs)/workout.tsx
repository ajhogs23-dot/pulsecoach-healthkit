import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabBackground } from "@/components/tab-background";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { exercisesFor, type ExerciseEquipment, type ExerciseLibraryItem, type MuscleGroup } from "@/lib/exercise-library";
import { loadCompletedWorkouts, loadWorkoutCheckIn, saveActiveWorkoutPlan, type CompletedWorkout, type WorkoutExercise } from "@/lib/workout-log";
import { applyReadinessVolume, contraindicationConfirmation, contraindicationWarning, isExerciseContraindicated, type WorkoutReadiness } from "@/lib/workout-selection";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const muscleGroups: MuscleGroup[] = ["Full body", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio"];
const durations = [20, 30, 45, 60];
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");
type PendingRiskyChoice = { exercise: ExerciseLibraryItem; replaceIndex?: number };
type WorkoutType = { title: string; detail: string; mark: string; action: "builder" | "activity" };

const workoutTypes: WorkoutType[] = [
  { title: "Run", detail: "Start a run and review your pace, distance, heart rate, splits, and route.", mark: "R", action: "activity" },
  { title: "Walk", detail: "Track an outdoor walk, time, distance, movement, and route.", mark: "W", action: "activity" },
  { title: "Cycle", detail: "Record a ride, duration, distance, effort, and route.", mark: "C", action: "activity" },
  { title: "Strength workout", detail: "Build a gym, dumbbell, or bodyweight session around your goals.", mark: "S", action: "builder" },
  { title: "Mobility & recovery", detail: "Choose a lighter session for movement quality and recovery.", mark: "M", action: "builder" },
  { title: "Other activity", detail: "Record another type of exercise or movement session.", mark: "+", action: "activity" },
];

function painSafeExercises(focus: MuscleGroup, profile: ProfilePreferences, limitation: string) {
  return exercisesFor(focus, profile.trainingSetup).filter((exercise) =>
    !isExerciseContraindicated(exercise.name, limitation, exercise.muscleGroup),
  );
}

function pickExercises(focus: MuscleGroup, duration: number, profile: ProfilePreferences, offset = 0, limitation = "", readiness: WorkoutReadiness = "Ready") {
  const available = painSafeExercises(focus, profile, limitation);
  const count = Math.min(available.length, focus === "Cardio" ? Math.max(1, Math.round(duration / 15)) : Math.max(3, Math.round(duration / 8)));
  if (focus !== "Full body") {
    const selected = Array.from({ length: count }, (_, index) => available[(index + offset) % available.length]);
    return applyReadinessVolume(selected, readiness);
  }

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
  return applyReadinessVolume(selected, readiness);
}

function toWorkoutExercise(item: ExerciseLibraryItem, profile: ProfilePreferences, duration: number, exerciseCount: number, readiness: WorkoutReadiness): WorkoutExercise {
  if (item.muscleGroup === "Cardio") {
    const readinessDuration = readiness === "Low" ? duration * 0.7 : readiness === "Okay" ? duration * 0.85 : duration;
    const minutes = Math.max(5, Math.floor(readinessDuration / Math.max(1, exerciseCount)));
    return { name: item.name, focus: item.focus, sets: 1, repTarget: `${minutes} min`, tracking: "time" };
  }
  const baseSets = profile.goal === "Maintain health" ? 2 : 3;
  return {
    name: item.name,
    focus: item.focus,
    sets: readiness === "Low" ? Math.max(1, baseSets - 1) : baseSets,
    repTarget: profile.goal === "Build strength" ? "8–10" : "10–12",
    tracking: "reps",
  };
}

export default function WorkoutScreen() {
  const {
    focus: requestedFocus,
    duration: requestedDuration,
    readiness: requestedReadiness,
    limitation: requestedLimitation,
    equipment: requestedEquipment,
  } = useLocalSearchParams<{ focus?: string; duration?: string; readiness?: string; limitation?: string; equipment?: string }>();
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [focus, setFocus] = useState<MuscleGroup>("Full body");
  const [duration, setDuration] = useState(30);
  const [selected, setSelected] = useState<ExerciseLibraryItem[]>([]);
  const [readiness, setReadiness] = useState<WorkoutReadiness>("Ready");
  const [limitation, setLimitation] = useState("");
  const [focusOpen, setFocusOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingRiskyChoice, setPendingRiskyChoice] = useState<PendingRiskyChoice | null>(null);
  const [showBuilder, setShowBuilder] = useState(Boolean(requestedFocus));

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadProfilePreferences(userKey), loadCompletedWorkouts(userKey), loadWorkoutCheckIn(userKey)]).then(([savedProfile, savedHistory, savedCheckIn]) => {
      if (!active) return;
      const focusAliases: Partial<Record<string, MuscleGroup>> = { Biceps: "Arms", Triceps: "Arms", Glutes: "Legs", Run: "Cardio", Walk: "Cardio", Cycle: "Cardio" };
      const initialFocus = typeof requestedFocus === "string"
        ? muscleGroups.includes(requestedFocus as MuscleGroup) ? requestedFocus as MuscleGroup : focusAliases[requestedFocus] ?? "Full body"
        : "Full body";
      const parsedDuration = Number(requestedDuration);
      const initialDuration = Number.isFinite(parsedDuration) && parsedDuration >= 10 && parsedDuration <= 180 ? Math.round(parsedDuration) : 30;
      const hasRequestedCheckIn = typeof requestedReadiness === "string" || typeof requestedLimitation === "string";
      const initialReadiness: WorkoutReadiness = hasRequestedCheckIn
        ? requestedReadiness === "Low" || requestedReadiness === "Okay" ? requestedReadiness : "Ready"
        : savedCheckIn?.readiness ?? "Ready";
      const initialLimitation = hasRequestedCheckIn
        ? typeof requestedLimitation === "string" ? requestedLimitation : ""
        : savedCheckIn?.limitation ?? "";
      const equipmentOptions: ExerciseEquipment[] = ["Bodyweight", "Dumbbells", "Full gym"];
      const initialEquipment = equipmentOptions.includes(requestedEquipment as ExerciseEquipment)
        ? requestedEquipment as ExerciseEquipment
        : savedProfile.trainingSetup;
      const effectiveProfile = { ...savedProfile, trainingSetup: initialEquipment };
      setProfile(effectiveProfile);
      setHistory(savedHistory);
      setFocus(initialFocus);
      setDuration(initialDuration);
      setReadiness(initialReadiness);
      setLimitation(initialLimitation);
      setSelected(pickExercises(initialFocus, initialDuration, effectiveProfile, savedHistory.length, initialLimitation, initialReadiness));
    });
    return () => { active = false; };
  }, [requestedDuration, requestedEquipment, requestedFocus, requestedLimitation, requestedReadiness, userKey]));

  const chooseFocus = (nextFocus: MuscleGroup) => {
    setFocus(nextFocus);
    setFocusOpen(false);
    setEditingIndex(null);
    setSelected(pickExercises(nextFocus, duration, profile, history.length, limitation, readiness));
  };

  const chooseDuration = (minutes: number) => {
    setDuration(minutes);
    setEditingIndex(null);
    setSelected(pickExercises(focus, minutes, profile, history.length, limitation, readiness));
  };

  const replaceExercise = (index: number, replacement: ExerciseLibraryItem) => {
    setSelected((current) => current.map((item, itemIndex) => itemIndex === index ? replacement : item));
    setEditingIndex(null);
  };

  const confirmRiskyChoice = () => {
    if (!pendingRiskyChoice) return;
    if (pendingRiskyChoice.replaceIndex === undefined) {
      setSelected((current) => current.some((item) => item.id === pendingRiskyChoice.exercise.id) ? current : [...current, pendingRiskyChoice.exercise]);
    } else {
      setSelected((current) => current.map((item, itemIndex) => itemIndex === pendingRiskyChoice.replaceIndex ? pendingRiskyChoice.exercise : item));
    }
    setEditingIndex(null);
    setPendingRiskyChoice(null);
  };

  const startSession = async () => {
    const exercises = selected.map((item) => toWorkoutExercise(item, profile, duration, selected.length, readiness));
    const allChoices = exercisesFor(focus, profile.trainingSetup);
    const excludedExerciseCount = allChoices.filter((exercise) =>
      isExerciseContraindicated(exercise.name, limitation, exercise.muscleGroup) && !selected.some((item) => item.id === exercise.id),
    ).length;
    await saveActiveWorkoutPlan(userKey, {
      title: focus === "Full body" ? "Full-body workout" : `${focus} workout`,
      focus,
      durationMinutes: duration,
      exercises,
      checkIn: { readiness, limitation: limitation.trim(), excludedExerciseCount },
    });
    router.push("/session");
  };

  const allCandidates = exercisesFor(focus, profile.trainingSetup);
  const candidates = painSafeExercises(focus, profile, limitation);
  const riskyCandidates = allCandidates.filter((exercise) => isExerciseContraindicated(exercise.name, limitation, exercise.muscleGroup));
  const selectedRiskyCount = selected.filter((exercise) => isExerciseContraindicated(exercise.name, limitation, exercise.muscleGroup)).length;
  const excludedExerciseCount = Math.max(0, riskyCandidates.length - selectedRiskyCount);
  const latest = [...history].reverse().slice(0, 3);

  const chooseWorkoutType = (type: WorkoutType) => {
    if (type.title === "Run") {
      router.push("/run" as any);
      return;
    }
    if (type.title === "Walk") {
      router.push("/walk" as any);
      return;
    }
    if (type.action === "builder") {
      if (type.title === "Mobility & recovery") chooseFocus("Core");
      setShowBuilder(true);
      return;
    }
    router.push({ pathname: "/activity", params: { type: type.title } } as any);
  };

  if (!showBuilder) return <ScreenContainer className="px-5 pt-4">
    <TabBackground source={require("@/assets/images/tab-backgrounds/workout.png")} opacity={0.22} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>WORKOUT</Text>
      <Text style={styles.title}>How do you want to move?</Text>
      <Text style={styles.subtitle}>Choose an activity to open its own setup and tracking page.</Text>
      <View style={styles.typeGrid}>
        {workoutTypes.map((type) => <Pressable key={type.title} style={({ pressed }) => [styles.typeCard, pressed && styles.pressed]} onPress={() => chooseWorkoutType(type)}>
          <View style={styles.typeMark}><Text style={styles.typeMarkText}>{type.mark}</Text></View>
          <View style={styles.flex}><Text style={styles.typeTitle}>{type.title}</Text><Text style={styles.typeDetail}>{type.detail}</Text></View>
          <View style={styles.typeArrow}><IconSymbol name="chevron.right" size={17} color={mint} /></View>
        </Pressable>)}
      </View>
      <Pressable style={styles.historyLink} onPress={() => router.push("/history" as any)}><View><Text style={styles.historyLinkTitle}>Your activity history</Text><Text style={styles.historyLinkCopy}>Past runs, route maps, workouts and sharing</Text></View><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>
      <Pressable style={styles.checkInLink} onPress={() => router.push("/choose-workout" as any)}><Text style={styles.checkInLinkText}>Pain, limitations & readiness</Text><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>
      <Text style={styles.note}>Your saved check-in is applied when VELTURA builds exercise suggestions. Activities that may heavily use a painful area should show a warning rather than disappearing.</Text>
    </ScrollView>
  </ScreenContainer>;

  return <ScreenContainer className="px-5 pt-4">
    <TabBackground source={require("@/assets/images/tab-backgrounds/workout.png")} opacity={0.18} />
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => setShowBuilder(false)}><Text style={styles.back}>‹ All workout types</Text></Pressable>
      <Text style={styles.eyebrow}>WORKOUT BUILDER</Text>
      <Text style={styles.title}>What do you want to train?</Text>
      <Text style={styles.subtitle}>Choose a body area and session length, then swap any exercise before you begin.</Text>
      <Pressable style={styles.checkInLink} onPress={() => router.push("/choose-workout" as any)}><Text style={styles.checkInLinkText}>{limitation || readiness !== "Ready" ? "Update today’s pain & readiness check-in" : "Add today’s pain & readiness check-in"}</Text><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>

      {limitation || readiness !== "Ready" ? <View style={styles.safetyCard}><Text style={styles.safetyTitle}>CHECK-IN APPLIED</Text>{limitation ? <Text style={styles.safetyCopy}>Pain/limitation noted: {limitation}. {excludedExerciseCount} potentially aggravating exercise{excludedExerciseCount === 1 ? "" : "s"} excluded from suggestions and swaps.</Text> : null}<Text style={styles.safetyCopy}>Readiness: {readiness}.{readiness === "Low" ? " Exercises and sets are reduced after pain-based exclusions; use a lighter, comfortable effort." : ""}</Text></View> : null}

      <Text style={styles.label}>TODAY’S FOCUS</Text>
      <Pressable style={styles.dropdown} onPress={() => setFocusOpen((open) => !open)}><Text style={styles.dropdownText}>{focus}</Text><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>
      {focusOpen ? <View style={styles.dropdownMenu}>{muscleGroups.map((group) => <Pressable key={group} onPress={() => chooseFocus(group)} style={[styles.dropdownOption, focus === group && styles.dropdownOptionActive]}><Text style={[styles.dropdownOptionText, focus === group && styles.dropdownOptionTextActive]}>{group}</Text></Pressable>)}</View> : null}

      <Text style={styles.label}>HOW LONG DO YOU WANT TO TRAIN?</Text>
      <View style={styles.durationRow}>{durations.map((minutes) => <Pressable key={minutes} onPress={() => chooseDuration(minutes)} style={[styles.duration, duration === minutes && styles.durationActive]}><Text style={[styles.durationText, duration === minutes && styles.durationTextActive]}>{minutes} min</Text></Pressable>)}</View>

      <View style={styles.summary}><View><Text style={styles.summaryLabel}>YOUR SESSION</Text><Text style={styles.summaryTitle}>{focus === "Full body" ? "Full-body workout" : `${focus} workout`}</Text><Text style={styles.summaryMeta}>{duration} min · {selected.length} exercises · {profile.trainingSetup}</Text></View><View style={styles.circle}><Text style={styles.circleText}>{duration}</Text><Text style={styles.circleLabel}>MIN</Text></View></View>

      <View style={styles.sectionRow}><Text style={styles.section}>Selected exercises</Text><Text style={styles.available}>{candidates.length} choices</Text></View>
      {selected.map((exercise, index) => <View key={`${exercise.id}-${index}`}>
        <Pressable style={styles.exercise} onPress={() => router.push(`/exercise/${exercise.id}` as any)}>
          <View style={styles.num}><Text style={styles.numText}>{index + 1}</Text></View>
          <View style={styles.flex}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{toWorkoutExercise(exercise, profile, duration, selected.length, readiness).tracking === "time" ? toWorkoutExercise(exercise, profile, duration, selected.length, readiness).repTarget : `${toWorkoutExercise(exercise, profile, duration, selected.length, readiness).sets} sets · ${toWorkoutExercise(exercise, profile, duration, selected.length, readiness).repTarget} reps`}</Text><Text style={styles.exerciseFocus}>{exercise.focus}</Text></View>
          <View style={styles.exerciseActions}><Text style={styles.guide}>Guide</Text><Pressable onPress={(event) => { event.stopPropagation(); setEditingIndex(editingIndex === index ? null : index); }}><Text style={styles.swap}>Change</Text></Pressable></View>
        </Pressable>
        {editingIndex === index ? <View style={styles.choiceList}><Text style={styles.choiceTitle}>Choose another {focus.toLowerCase()} exercise</Text>{candidates.filter((candidate) => !selected.some((item, selectedIndex) => selectedIndex !== index && item.id === candidate.id)).map((candidate) => <Pressable key={candidate.id} style={styles.choiceRow} onPress={() => replaceExercise(index, candidate)}><Text style={styles.choiceText}>{candidate.name}</Text><Text style={styles.choiceMeta}>{candidate.focus}</Text></Pressable>)}</View> : null}
      </View>)}

      {!selected.length ? <Text style={styles.noSafeExercises}>No exercises for this focus are suggested with the limitation entered. Choose another focus or seek individual guidance before training the painful area.</Text> : null}
      <Pressable disabled={!selected.length} style={({ pressed }) => [styles.start, !selected.length && styles.startDisabled, pressed && styles.pressed]} onPress={() => void startSession()}><IconSymbol name="play.fill" size={18} color="#111513" /><Text style={styles.startText}>Start this workout</Text></Pressable>

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
  back: { color: mint, fontSize: 13, fontWeight: "800" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  typeCard: { width: "48.5%", aspectRatio: 1, justifyContent: "space-between", backgroundColor: "rgba(27, 35, 29, 0.94)", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#384738" },
  typeMark: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#2B3B27" },
  typeMarkText: { color: mint, fontSize: 18, fontWeight: "900" },
  typeTitle: { color: "#F4F7F0", fontSize: 15, fontWeight: "900", marginBottom: 4, paddingRight: 10 },
  typeDetail: { color: muted, fontSize: 10.5, lineHeight: 14 },
  typeArrow: { position: "absolute", top: 15, right: 12 },
  historyLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(27, 35, 29, 0.95)", borderRadius: 15, padding: 14, borderWidth: 1, borderColor: "#384738" },
  historyLinkTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "900" },
  historyLinkCopy: { color: muted, fontSize: 10.5, marginTop: 3 },
  checkInLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#202A21", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: "#4D653D" },
  checkInLinkText: { color: mint, fontSize: 12, fontWeight: "800" },
  safetyCard: { backgroundColor: "#2A251A", borderRadius: 15, padding: 14, gap: 6, borderWidth: 1, borderColor: "#7A6330" },
  safetyTitle: { color: "#F7CF77", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  safetyCopy: { color: "#E5D6B3", fontSize: 11, lineHeight: 16 },
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
  startDisabled: { opacity: 0.4 },
  noSafeExercises: { color: "#F7CF77", fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  historyCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1B231D", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#263128" },
  historyTitle: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  historyMeta: { color: muted, fontSize: 11, marginTop: 3 },
  empty: { color: muted, fontSize: 12, lineHeight: 17 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
});
