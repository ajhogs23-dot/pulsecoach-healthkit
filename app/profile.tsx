import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, saveProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function ProfileScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
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
    void loadProfilePreferences(userKey).then((saved) => {
      if (!active) return;
      setProfile(saved);
      setCalorieTarget(saved.calorieTarget ? String(saved.calorieTarget) : "");
    });
    return () => { active = false; };
  }, [userKey]));

  const update = <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const save = async () => {
    const parsedTarget = calorieTarget.trim() ? Number(calorieTarget) : undefined;
    if (!profile.name.trim()) {
      setSavedMessage("Add your name before saving.");
      return;
    }
    if (parsedTarget !== undefined && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      setSavedMessage("The calorie target must be greater than zero or left blank.");
      return;
    }
    const next = { ...profile, name: profile.name.trim(), calorieTarget: parsedTarget };
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

      <ChoiceGroup title="Primary goal" items={["Build strength", "Improve fitness", "Maintain health"]} selected={profile.goal} onSelect={(value) => update("goal", value as ProfilePreferences["goal"])} />
      <ChoiceGroup title="Food preferences" items={["No preference", "Vegetarian", "High-protein"]} selected={profile.foodPreference} onSelect={(value) => update("foodPreference", value as ProfilePreferences["foodPreference"])} />
      <ChoiceGroup title="Training setup" items={["Dumbbells", "Full gym", "Bodyweight"]} selected={profile.trainingSetup} onSelect={(value) => update("trainingSetup", value as ProfilePreferences["trainingSetup"])} />
      <ChoiceGroup title="Coaching style" items={["Encouraging", "Direct", "Minimal"]} selected={profile.coachingStyle} onSelect={(value) => update("coachingStyle", value as ProfilePreferences["coachingStyle"])} />

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Daily calorie target (optional)</Text>
        <TextInput value={calorieTarget} onChangeText={(value) => { setCalorieTarget(value); setSavedMessage(""); }} placeholder="e.g. 2400" placeholderTextColor="#718071" keyboardType="number-pad" style={styles.input} />
        <Text style={styles.note}>Use a target chosen with appropriate professional guidance. PulseCoach does not calculate a medical diet prescription.</Text>
      </View>

      <Pressable style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} onPress={() => void save()}><Text style={styles.saveText}>Save profile</Text></Pressable>
      {savedMessage ? <Text style={savedMessage === "Profile saved." ? styles.success : styles.warning}>{savedMessage}</Text> : null}

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
