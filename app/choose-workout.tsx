import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import {
  buildFocusPlan,
  limitationForPainArea,
  type PainArea,
  type WorkoutFocus,
  type WorkoutReadiness,
} from "@/lib/workout-selection";
import { saveWorkoutCheckIn } from "@/lib/workout-log";
import { useAuth } from "@/hooks/use-auth";
import type { ExerciseEquipment } from "@/lib/exercise-library";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const focuses: WorkoutFocus[] = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Arms", "Legs", "Glutes", "Core", "Full body", "Cardio", "Run", "Walk", "Cycle", "Mobility/recovery", "Custom workout"];
const stylesList = ["Strength", "Muscle growth", "Endurance", "General fitness", "Recovery"];
const painAreas: PainArea[] = ["None", "Shoulder", "Elbow", "Wrist/hand", "Neck", "Back", "Hip", "Knee", "Ankle/foot", "Other"];
const equipmentChoices: { label: string; value: ExerciseEquipment; detail: string }[] = [
  { label: "No equipment", value: "Bodyweight", detail: "Bodyweight movements" },
  { label: "Home equipment", value: "Dumbbells", detail: "Dumbbells and bodyweight" },
  { label: "Gym", value: "Full gym", detail: "Machines, cables, and free weights" },
];
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function ChooseWorkoutScreen() {
  const { user } = useAuth({ autoFetch: false });
  const [focus, setFocus] = useState<WorkoutFocus>("Full body");
  const [minutes, setMinutes] = useState("35");
  const [equipment, setEquipment] = useState<ExerciseEquipment>("Dumbbells");
  const [style, setStyle] = useState("General fitness");
  const [readiness, setReadiness] = useState<WorkoutReadiness>("Ready");
  const [painArea, setPainArea] = useState<PainArea>("None");
  const [otherLimitation, setOtherLimitation] = useState("");
  const limitation = limitationForPainArea(painArea, otherLimitation);
  const equipmentLabel = equipmentChoices.find((choice) => choice.value === equipment)?.label ?? equipment;
  const plan = useMemo(
    () => buildFocusPlan(focus, Number(minutes), limitation, readiness),
    [focus, limitation, minutes, readiness],
  );

  const applyWorkout = async () => {
    await saveWorkoutCheckIn(storageKey(user), { readiness, limitation });
    router.replace({
      pathname: "/workout",
      params: { focus, duration: String(plan.minutes), readiness, limitation, equipment, fresh: "1" },
    } as any);
  };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScreenContainer className="px-5 pt-4">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹  Workout</Text></Pressable>
        <Text style={styles.eyebrow}>SESSION BUILDER</Text>
        <Text style={styles.title}>Choose today’s workout</Text>
        <Text style={styles.subtitle}>Start with anything that needs protecting today. Your choices update the workout suggestions.</Text>

        <Text style={styles.label}>Any pain or limitation today?</Text>
        <Text style={styles.helper}>Choose one area. Select Other if you need to describe something different.</Text>
        <View style={styles.chips}>{painAreas.map((item) => <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: item === painArea }}
          accessibilityLabel={`${item}${item === painArea ? ", selected" : ""}`}
          onPress={() => setPainArea(item)}
          style={[styles.chip, item === painArea && styles.chipActive]}
        ><Text style={[styles.chipText, item === painArea && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
        {painArea === "Other" ? <TextInput
          accessibilityLabel="Describe your pain or limitation"
          value={otherLimitation}
          onChangeText={setOtherLimitation}
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="Describe what to protect"
          placeholderTextColor="#718071"
          returnKeyType="done"
        /> : null}

        <Text style={styles.label}>Where are you training?</Text>
        <Text style={styles.helper}>Choose what you can use today.</Text>
        <View style={styles.choiceStack}>{equipmentChoices.map((choice) => <Pressable
          key={choice.value}
          accessibilityRole="button"
          accessibilityState={{ selected: choice.value === equipment }}
          onPress={() => setEquipment(choice.value)}
          style={[styles.choiceCard, choice.value === equipment && styles.choiceCardActive]}
        ><View style={styles.choiceBody}><Text style={[styles.choiceLabel, choice.value === equipment && styles.choiceLabelActive]}>{choice.label}</Text><Text style={styles.choiceDetail}>{choice.detail}</Text></View><Text style={[styles.choiceCheck, choice.value === equipment && styles.choiceCheckActive]}>{choice.value === equipment ? "✓" : ""}</Text></Pressable>)}</View>

        <Text style={styles.label}>Primary focus</Text>
        <View style={styles.chips}>{focuses.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === focus }} onPress={() => setFocus(item)} style={[styles.chip, item === focus && styles.chipActive]}><Text style={[styles.chipText, item === focus && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>

        <Text style={styles.label}>Available time</Text>
        <TextInput accessibilityLabel="Available workout time in minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={styles.input} placeholder="Minutes" placeholderTextColor="#718071" />

        <Text style={styles.label}>Workout style</Text>
        <View style={styles.row}>{stylesList.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === style }} onPress={() => setStyle(item)} style={[styles.smallChip, item === style && styles.chipActive]}><Text style={[styles.chipText, item === style && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>

        <Text style={styles.label}>Current energy</Text>
        <View style={styles.row}>{(["Low", "Okay", "Ready"] as WorkoutReadiness[]).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === readiness }} onPress={() => setReadiness(item)} style={[styles.smallChip, item === readiness && styles.chipActive]}><Text style={[styles.chipText, item === readiness && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>

        <View style={styles.preview}>
          <Text style={styles.previewEyebrow}>PREVIEW · {style.toUpperCase()} · {equipmentLabel.toUpperCase()}</Text>
          <Text style={styles.previewTitle}>{plan.focus} session · {plan.minutes} min</Text>
          <Text style={styles.previewCopy}>{plan.exercises.join("  ·  ")}</Text>
          {plan.limitationAcknowledged ? <Text style={styles.safety}>Pain/limitation noted: {limitation}. {plan.changedForLimitation ? "Potentially aggravating movements were removed." : "Suggestions were checked against this selection."}</Text> : null}
          {plan.volumeAdjustedForReadiness ? <Text style={styles.safety}>Low readiness noted: workout volume has been reduced after pain-based exclusions.</Text> : null}
        </View>
        <Pressable style={styles.confirm} onPress={() => void applyWorkout()}><Text style={styles.confirmText}>Use this workout</Text></Pressable>
        <Text style={styles.note}>Changing focus replaces the suggestions only. If you have completed sets, VELTURA will ask whether to continue, save the partial workout, or discard the uncompleted plan.</Text>
      </ScrollView>
    </ScreenContainer>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "rgba(10, 43, 67, 0.50)" },
  content: { paddingBottom: 52, gap: 12 },
  back: { color: mint, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20, marginBottom: 2 },
  label: { color: "#F4F7F0", fontSize: 14, fontWeight: "800", marginTop: 8 },
  helper: { color: muted, fontSize: 11, lineHeight: 16, marginTop: -5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, justifyContent: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 13, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" },
  chipActive: { backgroundColor: "#2C3B25", borderColor: mint },
  chipText: { color: muted, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: mint },
  input: { backgroundColor: "rgba(10, 43, 67, 0.50)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)", borderRadius: 13, padding: 13, color: "#F4F7F0", fontSize: 14 },
  multiline: { minHeight: 82, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallChip: { minHeight: 44, justifyContent: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" },
  choiceStack: { gap: 8 },
  choiceCard: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 13, borderRadius: 14, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" },
  choiceCardActive: { backgroundColor: "#2C3B25", borderColor: mint },
  choiceBody: { flex: 1 },
  choiceLabel: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  choiceLabelActive: { color: mint },
  choiceDetail: { color: muted, fontSize: 11, marginTop: 3 },
  choiceCheck: { width: 24, color: muted, fontSize: 18, fontWeight: "900", textAlign: "center" },
  choiceCheckActive: { color: mint },
  preview: { backgroundColor: "rgba(76, 143, 184, 0.40)", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.54)", gap: 8, marginTop: 6 },
  previewEyebrow: { color: mint, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  previewTitle: { color: "#F4F7F0", fontSize: 18, fontWeight: "800" },
  previewCopy: { color: muted, fontSize: 12, lineHeight: 18 },
  safety: { color: "#F7CF77", fontSize: 11, lineHeight: 16 },
  confirm: { backgroundColor: mint, borderRadius: 15, alignItems: "center", padding: 15, marginTop: 4 },
  confirmText: { color: "#111513", fontWeight: "900", fontSize: 15 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
});
