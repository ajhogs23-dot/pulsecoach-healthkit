import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Speech from "expo-speech";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { getWorkoutPlan, loadActiveWorkoutPlan, saveCompletedWorkout, type ActiveWorkoutPlan, type WorkoutSetLog } from "@/lib/workout-log";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function SessionScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [activePlan, setActivePlan] = useState<ActiveWorkoutPlan | undefined>();
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [logs, setLogs] = useState<WorkoutSetLog[][]>([]);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    void Promise.all([loadProfilePreferences(userKey), loadActiveWorkoutPlan(userKey)]).then(([savedProfile, savedPlan]) => {
      setProfile(savedProfile);
      setActivePlan(savedPlan);
    });
  }, [userKey]);

  const plan = activePlan ?? getWorkoutPlan(profile);
  const exercise = plan.exercises[exerciseIndex];
  const completedForExercise = logs[exerciseIndex] ?? [];
  const nextSetNumber = completedForExercise.length + 1;

  const completeSet = async () => {
    const repValue = Number(reps);
    const weightValue = weight.trim() ? Number(weight) : undefined;
    if (!Number.isFinite(repValue) || repValue <= 0) {
      setFeedback("Enter the reps you completed.");
      return;
    }
    if (weightValue !== undefined && (!Number.isFinite(weightValue) || weightValue < 0)) {
      setFeedback("Weight must be zero or greater, or left blank.");
      return;
    }

    const nextLogs = logs.map((sets) => [...sets]);
    while (nextLogs.length < plan.exercises.length) nextLogs.push([]);
    nextLogs[exerciseIndex] = [...nextLogs[exerciseIndex], { reps: repValue, weightKg: weightValue }];
    setLogs(nextLogs);
    setReps("");
    setWeight("");
    setFeedback("");

    const exerciseFinished = nextLogs[exerciseIndex].length >= exercise.sets;
    const sessionFinished = exerciseFinished && exerciseIndex === plan.exercises.length - 1;

    if (sessionFinished) {
      await saveCompletedWorkout(userKey, {
        title: plan.title,
        durationMinutes: plan.durationMinutes,
        exercises: plan.exercises.map((item, index) => ({ ...item, completedSets: nextLogs[index] ?? [] })),
      });
      setFinished(true);
      Speech.stop();
      Speech.speak("Session complete. Nice work. Your workout has been saved.");
      return;
    }

    if (exerciseFinished) {
      setExerciseIndex((current) => current + 1);
      Speech.stop();
      Speech.speak("Exercise complete. Move to the next exercise when ready.");
    } else {
      Speech.stop();
      Speech.speak(`Set complete. Rest, then prepare for set ${nextLogs[exerciseIndex].length + 1}.`);
    }
  };

  if (finished) {
    const totalSets = logs.reduce((total, sets) => total + sets.length, 0);
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4"><View style={styles.finishContent}>
      <View style={styles.finishIcon}><IconSymbol name="checkmark" size={42} color={mint} /></View>
      <Text style={styles.finishTitle}>Workout complete.</Text>
      <Text style={styles.finishCopy}>{plan.title} saved with {totalSets} completed sets. Your Workout history and Today card are now updated.</Text>
      <Pressable style={styles.primary} onPress={() => router.replace("/workout")}><Text style={styles.primaryText}>Return to workouts</Text></Pressable>
    </View></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Exit session</Text></Pressable>
      <View style={styles.top}><View style={styles.flex}><Text style={styles.eyebrow}>EXERCISE {exerciseIndex + 1} OF {plan.exercises.length}</Text><Text style={styles.title}>{exercise.name}</Text><Text style={styles.meta}>{exercise.repTarget} reps · Set {nextSetNumber} of {exercise.sets}</Text></View><View style={styles.timer}><Text style={styles.timerText}>{completedForExercise.length}</Text><Text style={styles.timerLabel}>SETS</Text></View></View>

      <View style={styles.formCard}><View style={styles.figure}><IconSymbol name="dumbbell.fill" size={42} color={mint} /></View><Text style={styles.formTitle}>Log what you completed.</Text><Text style={styles.formCopy}>Use a controlled range that feels stable. Leave weight blank for bodyweight movements.</Text></View>

      <View style={styles.inputs}>
        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Reps</Text><TextInput value={reps} onChangeText={setReps} placeholder={exercise.repTarget} placeholderTextColor="#718071" keyboardType="number-pad" style={styles.input} /></View>
        <View style={styles.inputGroup}><Text style={styles.inputLabel}>Weight kg (optional)</Text><TextInput value={weight} onChangeText={setWeight} placeholder="0" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.input} /></View>
      </View>

      {completedForExercise.length ? <View style={styles.loggedSets}><Text style={styles.inputLabel}>COMPLETED SETS</Text>{completedForExercise.map((set, index) => <Text key={index} style={styles.setText}>Set {index + 1}: {set.reps} reps{set.weightKg === undefined ? "" : ` · ${set.weightKg} kg`}</Text>)}</View> : null}
      {feedback ? <Text style={styles.warning}>{feedback}</Text> : null}

      <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => void completeSet()}><Text style={styles.primaryText}>{nextSetNumber === exercise.sets && exerciseIndex === plan.exercises.length - 1 ? "Finish workout" : nextSetNumber === exercise.sets ? "Complete exercise" : "Complete set"}</Text><IconSymbol name="chevron.right" size={20} color="#111513" /></Pressable>
      <Text style={styles.note}>Stop if you feel sharp pain, dizziness, or unusual symptoms.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 25, gap: 18 },
  flex: { flex: 1 },
  back: { color: mint, fontSize: 15, fontWeight: "700" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4, gap: 12 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: "#F4F7F0", fontSize: 29, fontWeight: "800", marginTop: 8, letterSpacing: -0.7 },
  meta: { color: muted, fontSize: 14, marginTop: 5 },
  timer: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: mint, alignItems: "center", justifyContent: "center" },
  timerText: { color: "#F4F7F0", fontWeight: "800", fontSize: 22 },
  timerLabel: { color: mint, fontSize: 9, fontWeight: "800" },
  formCard: { minHeight: 190, backgroundColor: "#1B231D", borderRadius: 25, borderWidth: 1, borderColor: "#2D392E", alignItems: "center", justifyContent: "center", padding: 22 },
  figure: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center", marginBottom: 15 },
  formTitle: { color: "#F4F7F0", fontSize: 20, fontWeight: "800", textAlign: "center" },
  formCopy: { color: muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 },
  inputs: { flexDirection: "row", gap: 10 },
  inputGroup: { flex: 1, gap: 7 },
  inputLabel: { color: muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  input: { backgroundColor: "#111513", borderRadius: 13, borderWidth: 1, borderColor: "#3B4A3B", padding: 13, color: "#F4F7F0", fontWeight: "800" },
  loggedSets: { backgroundColor: "#202A21", borderRadius: 15, padding: 13, gap: 6, borderWidth: 1, borderColor: "#354536" },
  setText: { color: "#F4F7F0", fontSize: 12, fontWeight: "700" },
  primary: { backgroundColor: mint, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  primaryText: { color: "#111513", fontWeight: "800", fontSize: 14 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  warning: { color: "#FFD166", fontSize: 12 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16, textAlign: "center" },
  finishContent: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  finishIcon: { width: 90, height: 90, borderRadius: 30, backgroundColor: "#2C3321", alignItems: "center", justifyContent: "center" },
  finishTitle: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" },
  finishCopy: { color: muted, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
