import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { loadHealthSnapshot, type HealthSyncSnapshot } from "@/lib/healthkit";
import { DEFAULT_PROFILE_PREFERENCES, loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
import { useThemeContext } from "@/lib/theme-provider";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");

export default function ProfileScreen() {
  const { colorScheme, setColorScheme } = useThemeContext();
  const { user } = useAuth();
  const userKey = storageKey(user);
  const [profile, setProfile] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [health, setHealth] = useState<HealthSyncSnapshot | null>(null);
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);
  const personalDetailsOpening = useRef(false);
  const feedbackMutation = trpc.feedback.create.useMutation({
    onSuccess: () => {
      setSent(true);
      setFeedback("");
    },
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    setProfile(DEFAULT_PROFILE_PREFERENCES);
    void Promise.all([loadProfilePreferences(userKey), loadHealthSnapshot(userKey)]).then(([saved, healthSnapshot]) => {
      if (!active) return;
      setProfile(saved);
      setHealth(healthSnapshot);
    }).catch(() => {
      if (active) setHealth(null);
    });
    return () => { active = false; personalDetailsOpening.current = false; };
  }, [userKey]));

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text onPress={() => router.back()} style={styles.back}>‹ Back</Text>
      <Text style={styles.eyebrow}>YOUR PROFILE</Text>
      <Text style={styles.title}>Make coaching fit you.</Text>
      <Text style={styles.subtitle}>Manage your personal details, appearance and connected health data.</Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Appearance</Text>
        <Text style={styles.appearanceCopy}>Both modes keep the cards translucent so the tab backgrounds remain visible.</Text>
        <View style={styles.appearanceRow}>{(["light", "dark"] as const).map((scheme) => <Pressable key={scheme} onPress={() => setColorScheme(scheme)} style={[styles.appearanceChoice, colorScheme === scheme && styles.appearanceChoiceActive]}><IconSymbol name={scheme === "light" ? "sun.max.fill" : "moon.fill"} size={20} color={colorScheme === scheme ? "#111513" : "#E7F1F6"} /><Text style={[styles.appearanceText, colorScheme === scheme && styles.appearanceTextActive]}>{scheme === "light" ? "Light" : "Dark"}</Text></Pressable>)}</View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Personal Details" style={styles.settingsCard} onPress={() => {
        // The explicit group segment keeps this transition inside the Profile stack.
        // The lock is released when the screen loses focus, so returning works repeatedly.
        if (personalDetailsOpening.current) return;
        personalDetailsOpening.current = true;
        try { router.push("/(profile)/personal-details"); } catch {
          personalDetailsOpening.current = false;
        }
      }}>
        <View style={styles.settingsBody}><Text style={styles.settingsTitle}>Personal Details</Text><Text style={styles.settingsCopy}>{user ? [profile.name || user.name, profile.goal, "Body, preferences and calorie targets"].filter(Boolean).join(" | ") : "Sign in to manage your details"}</Text></View>
        <IconSymbol name="chevron.right" size={19} color={muted} />
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="Settings" style={styles.settingsCard} onPress={() => router.push("/settings" as any)}>
        <View style={styles.settingsBody}><Text style={styles.settingsTitle}>Settings</Text><Text style={styles.settingsCopy}>Profile, goals, workouts, privacy and app preferences</Text></View>
        <IconSymbol name="chevron.right" size={19} color={muted} />
      </Pressable>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Settings</Text>
        <Pressable style={({ pressed }) => [styles.settingsCard, pressed && styles.pressed]} onPress={() => router.push("/health")}>
          <View style={styles.settingsIcon}><IconSymbol name="heart.text.square.fill" size={23} color={mint} /></View>
          <View style={styles.settingsBody}>
            <Text style={styles.settingsTitle}>Apple Health</Text>
            <Text style={styles.settingsCopy}>{health?.status === "connected" || health?.lastSyncedAt ? "Connected · Manage categories and sync" : "Not connected · Set up Apple Health"}</Text>
          </View>
          <IconSymbol name="chevron.right" size={19} color={muted} />
        </Pressable>
      </View>

      <View style={styles.feedback}>
        <Text style={styles.feedbackTitle}>Help shape VELTURA</Text>
        <Text style={styles.feedbackCopy}>Suggest a feature, report an issue, or tell us what would make coaching more useful.</Text>
        <TextInput value={feedback} onChangeText={setFeedback} placeholder="Your idea or issue…" placeholderTextColor="#718071" multiline style={styles.feedbackInput} />
        <Pressable style={styles.feedbackButton} onPress={() => { if (feedback.trim()) feedbackMutation.mutate({ category: "feature", message: feedback.trim(), contactAllowed: false }); }}><Text style={styles.feedbackButtonText}>{feedbackMutation.isPending ? "Sending…" : sent ? "Thanks — feedback received" : "Send feedback"}</Text></Pressable>
      </View>
      <Pressable style={styles.adminLink} onPress={() => router.push("/admin" as any)}><Text style={styles.adminText}>Owner administration ›</Text></Pressable>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 18 },
  back: { color: mint, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  group: { gap: 10, marginTop: 4 },
  groupTitle: { color: "#F4F7F0", fontSize: 16, fontWeight: "800" },
  appearanceCopy: { color: muted, fontSize: 11, lineHeight: 16 },
  appearanceRow: { flexDirection: "row", gap: 10 },
  appearanceChoice: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, padding: 13, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" },
  appearanceChoiceActive: { backgroundColor: mint, borderColor: mint },
  appearanceText: { color: "#E7F1F6", fontWeight: "800" },
  appearanceTextActive: { color: "#111513" },
  inputRow: { flexDirection: "row", gap: 8 },
  rowInput: { flex: 1, backgroundColor: "rgba(10, 43, 67, 0.50)", borderRadius: 13, borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.58)", padding: 11, color: "#F4F7F0", fontSize: 12 },
  estimateCard: { backgroundColor: "rgba(76, 143, 184, 0.40)", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#4D653D", gap: 6 },
  estimateLabel: { color: mint, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  estimateValue: { color: "#F4F7F0", fontSize: 28, fontWeight: "900" },
  estimateCopy: { color: muted, fontSize: 11, lineHeight: 16 },
  input: { backgroundColor: "rgba(10, 43, 67, 0.50)", borderRadius: 13, borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.58)", padding: 13, color: "#F4F7F0", fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" },
  chipActive: { backgroundColor: "#2C3B25", borderColor: mint },
  chipText: { color: muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: mint },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  saveButton: { backgroundColor: mint, borderRadius: 15, padding: 15, alignItems: "center" },
  saveText: { color: "#111513", fontWeight: "900" },
  success: { color: mint, fontSize: 12, fontWeight: "800" },
  warning: { color: "#FFD166", fontSize: 12, fontWeight: "700" },
  settingsGroup: { gap: 10, marginTop: 4 },
  settingsCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(76, 143, 184, 0.40)", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.54)" },
  settingsIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(54, 119, 161, 0.46)", alignItems: "center", justifyContent: "center" },
  settingsBody: { flex: 1 },
  settingsTitle: { color: "#F4F7F0", fontSize: 15, fontWeight: "800" },
  settingsCopy: { color: muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  feedback: { backgroundColor: "rgba(76, 143, 184, 0.40)", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.54)", gap: 10, marginTop: 4 },
  feedbackTitle: { color: "#F4F7F0", fontSize: 16, fontWeight: "800" },
  feedbackCopy: { color: muted, fontSize: 11, lineHeight: 16 },
  feedbackInput: { minHeight: 82, color: "#F4F7F0", backgroundColor: "rgba(10, 43, 67, 0.50)", borderRadius: 12, padding: 12, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" },
  feedbackButton: { backgroundColor: mint, borderRadius: 13, padding: 13, alignItems: "center" },
  feedbackButtonText: { color: "#111513", fontWeight: "800" },
  adminLink: { alignItems: "center", padding: 10 },
  adminText: { color: mint, fontSize: 12, fontWeight: "800" },
  note: { color: "#718071", fontSize: 11, lineHeight: 16 },
});
