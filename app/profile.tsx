import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { loadHealthSnapshot, type HealthSyncSnapshot } from "@/lib/healthkit";
import { calculateCalorieEstimate, DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, saveProfilePreferences, type ActivityLevel, type EstimateSex, type ProfilePreferences, type ProfileGoal } from "@/lib/profile-preferences";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function ProfileScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [health, setHealth] = useState<HealthSyncSnapshot | null>(null);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);
  const feedbackMutation = trpc.feedback.create.useMutation({
    onSuccess: () => {
      setSent(true);
      setFeedback("");
    },
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadProfilePreferences(userKey), loadHealthSnapshot(userKey)]).then(([saved, healthSnapshot]) => {
      if (!active) return;
      setProfile(saved);
      setHealth(healthSnapshot);
      setAge(saved.age ? String(saved.age) : "");
      setHeightCm(saved.heightCm ? String(saved.heightCm) : "");
      setWeightKg(saved.weightKg ? String(saved.weightKg) : "");
      setCalorieTarget(saved.calorieTarget ? String(saved.calorieTarget) : "");
    }).catch(() => {
      if (active) setHealth(null);
    });
    return () => { active = false; };
  }, [userKey]));

  const update = <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const previewProfile: ProfilePreferences = {
    ...profile,
    age: age.trim() ? Number(age) : undefined,
    heightCm: heightCm.trim() ? Number(heightCm) : undefined,
    weightKg: weightKg.trim() ? Number(weightKg) : undefined,
  };
  const estimate = calculateCalorieEstimate(previewProfile);

  const save = async () => {
    const parsedTarget = calorieTarget.trim() ? Number(calorieTarget) : undefined;
    if (!profile.name.trim()) {
      setSavedMessage("Add your name before saving.");
      return;
    }
    const bodyValues = [previewProfile.age, previewProfile.heightCm, previewProfile.weightKg];
    const hasAnyEstimateField = Boolean(profile.sexForEstimate || bodyValues.some((value) => value !== undefined));
    if (hasAnyEstimateField && (!profile.sexForEstimate || bodyValues.some((value) => value === undefined || !Number.isFinite(value) || value! <= 0))) {
      setSavedMessage("Complete sex, age, height, and weight with valid numbers for the estimate.");
      return;
    }
    if (parsedTarget !== undefined && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      setSavedMessage("The calorie target must be greater than zero or left blank.");
      return;
    }
    const next = { ...previewProfile, name: profile.name.trim(), calorieTarget: parsedTarget };
    await saveProfilePreferences(userKey, next);
    setProfile(next);
    setSavedMessage("Profile saved.");
  };

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text onPress={() => router.back()} style={styles.back}>‹ Back</Text>
      <Text style={styles.eyebrow}>YOUR PROFILE</Text>
      <Text style={styles.title}>Make coaching fit you.</Text>
      <Text style={styles.subtitle}>These settings stay on this device and shape PulseCoach’s daily guidance.</Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Your name</Text>
        <TextInput value={profile.name} onChangeText={(value) => update("name", value)} placeholder="Name" placeholderTextColor="#718071" style={styles.input} />
      </View>

      <ChoiceGroup title="Sex used for calorie estimate" items={["Male", "Female"]} selected={profile.sexForEstimate ?? ""} onSelect={(value) => update("sexForEstimate", value as EstimateSex)} />
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Body details</Text>
        <View style={styles.inputRow}>
          <TextInput value={age} onChangeText={(value) => { setAge(value); setSavedMessage(""); }} placeholder="Age" placeholderTextColor="#718071" keyboardType="number-pad" style={styles.rowInput} />
          <TextInput value={heightCm} onChangeText={(value) => { setHeightCm(value); setSavedMessage(""); }} placeholder="Height cm" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.rowInput} />
          <TextInput value={weightKg} onChangeText={(value) => { setWeightKg(value); setSavedMessage(""); }} placeholder="Weight kg" placeholderTextColor="#718071" keyboardType="decimal-pad" style={styles.rowInput} />
        </View>
      </View>

      <ChoiceGroup title="Primary goal" items={["Lose fat", "Build strength", "Improve fitness", "Maintain health"]} selected={profile.goal} onSelect={(value) => update("goal", value as ProfileGoal)} />
      <ChoiceGroup title="Activity level" items={["Sedentary", "Lightly active", "Moderately active", "Very active"]} selected={profile.activityLevel} onSelect={(value) => update("activityLevel", value as ActivityLevel)} />
      <ChoiceGroup title="Food preferences" items={["No preference", "Vegetarian", "High-protein"]} selected={profile.foodPreference} onSelect={(value) => update("foodPreference", value as ProfilePreferences["foodPreference"])} />
      <ChoiceGroup title="Training setup" items={["Dumbbells", "Full gym", "Bodyweight"]} selected={profile.trainingSetup} onSelect={(value) => update("trainingSetup", value as ProfilePreferences["trainingSetup"])} />
      <ChoiceGroup title="Coaching style" items={["Encouraging", "Direct", "Minimal"]} selected={profile.coachingStyle} onSelect={(value) => update("coachingStyle", value as ProfilePreferences["coachingStyle"])} />

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Daily calorie target (optional)</Text>
        <TextInput value={calorieTarget} onChangeText={(value) => { setCalorieTarget(value); setSavedMessage(""); }} placeholder="e.g. 2400" placeholderTextColor="#718071" keyboardType="number-pad" style={styles.input} />
        <Text style={styles.note}>Leave blank to use the calculated recommendation, or enter a professional/manual target to override it.</Text>
      </View>
      {estimate ? <View style={styles.estimateCard}>
        <Text style={styles.estimateLabel}>ESTIMATED DAILY INTAKE</Text>
        <Text style={styles.estimateValue}>{estimate.recommendedCalories.toLocaleString("en-AU")} kcal</Text>
        <Text style={styles.estimateCopy}>Maintenance estimate: {estimate.maintenanceCalories.toLocaleString("en-AU")} kcal · Resting estimate: {estimate.restingCalories.toLocaleString("en-AU")} kcal</Text>
        <Text style={styles.note}>This is a starting estimate, not a medical prescription. Actual needs vary and should be adjusted using progress, energy, training, and professional advice.</Text>
      </View> : <Text style={styles.note}>Complete sex, age, height, and weight to calculate an estimate.</Text>}

      <Pressable style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} onPress={() => void save()}><Text style={styles.saveText}>Save profile</Text></Pressable>
      {savedMessage ? <Text style={savedMessage === "Profile saved." ? styles.success : styles.warning}>{savedMessage}</Text> : null}

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Settings</Text>
        <Pressable style={({ pressed }) => [styles.settingsCard, pressed && styles.pressed]} onPress={() => router.push("/health")}>
          <View style={styles.settingsIcon}><IconSymbol name="heart.text.square.fill" size={23} color={mint} /></View>
          <View style={styles.settingsBody}>
            <Text style={styles.settingsTitle}>Apple Health</Text>
            <Text style={styles.settingsCopy}>${health?.status === "connected" || health?.lastSyncedAt ? "Connected · Manage categories and sync" : "Not connected · Set up Apple Health"}</Text>
          </View>
          <IconSymbol name="chevron.right" size={19} color={muted} />
        </Pressable>
      </View>

      <View style={styles.feedback}>
        <Text style={styles.feedbackTitle}>Help shape PulseCoach</Text>
        <Text style={styles.feedbackCopy}>Suggest a feature, report an issue, or tell us what would make coaching more useful.</Text>
        <TextInput value={feedback} onChangeText={setFeedback} placeholder="Your idea or issue…" placeholderTextColor="#718071" multiline style={styles.feedbackInput} />
        <Pressable style={styles.feedbackButton} onPress={() => { if (feedback.trim()) feedbackMutation.mutate({ category: "feature", message: feedback.trim(), contactAllowed: false }); }}><Text style={styles.feedbackButtonText}>{feedbackMutation.isPending ? "Sending…" : sent ? "Thanks — feedback received" : "Send feedback"}</Text></Pressable>
      </View>
      <Pressable style={styles.adminLink} onPress={() => router.push("/admin" as any)}><Text style={styles.adminText}>Owner administration ›</Text></Pressable>
    </ScrollView>
  </ScreenContainer>;
}

function ChoiceGroup({ title, items, selected, onSelect }: { title: string; items: string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.group}><Text style={styles.groupTitle}>{title}</Text><View style={styles.chips}>{items.map((item) => {
    const active = item === selected;
    return <Pressable key={item} onPress={() => onSelect(item)} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text></Pressable>;
  })}</View></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 18 },
  back: { color: mint, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  group: { gap: 10, marginTop: 4 },
  groupTitle: { color: "#F4F7F0", fontSize: 16, fontWeight: "800" },
  inputRow: { flexDirection: "row", gap: 8 },
  rowInput: { flex: 1, backgroundColor: "#111513", borderRadius: 13, borderWidth: 1, borderColor: "#3B4A3B", padding: 11, color: "#F4F7F0", fontSize: 12 },
  estimateCard: { backgroundColor: "#202A21", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#4D653D", gap: 6 },
  estimateLabel: { color: mint, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  estimateValue: { color: "#F4F7F0", fontSize: 28, fontWeight: "900" },
  estimateCopy: { color: muted, fontSize: 11, lineHeight: 16 },
  input: { backgroundColor: "#111513", borderRadius: 13, borderWidth: 1, borderColor: "#3B4A3B", padding: 13, color: "#F4F7F0", fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#2D392E" },
  chipActive: { backgroundColor: "#2C3B25", borderColor: mint },
  chipText: { color: muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: mint },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  saveButton: { backgroundColor: mint, borderRadius: 15, padding: 15, alignItems: "center" },
  saveText: { color: "#111513", fontWeight: "900" },
  success: { color: mint, fontSize: 12, fontWeight: "800" },
  warning: { color: "#FFD166", fontSize: 12, fontWeight: "700" },
  settingsGroup: { gap: 10, marginTop: 4 },
  settingsCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#202A21", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#354536" },
  settingsIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#2B3B27", alignItems: "center", justifyContent: "center" },
  settingsBody: { flex: 1 },
  settingsTitle: { color: "#F4F7F0", fontSize: 15, fontWeight: "800" },
  settingsCopy: { color: muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  feedback: { backgroundColor: "#202A21", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#354536", gap: 10, marginTop: 4 },
  feedbackTitle: { color: "#F4F7F0", fontSize: 16, fontWeight: "800" },
  feedbackCopy: { color: muted, fontSize: 11, lineHeight: 16 },
  feedbackInput: { minHeight: 82, color: "#F4F7F0", backgroundColor: "#111513", borderRadius: 12, padding: 12, textAlignVertical: "top", borderWidth: 1, borderColor: "#2D392E" },
  feedbackButton: { backgroundColor: mint, borderRadius: 13, padding: 13, alignItems: "center" },
  feedbackButtonText: { color: "#111513", fontWeight: "800" },
  adminLink: { alignItems: "center", padding: 10 },
  adminText: { color: mint, fontSize: 12, fontWeight: "800" },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
});
