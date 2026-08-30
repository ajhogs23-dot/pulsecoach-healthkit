import { useCallback, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { loadHealthSnapshot, syncHealthData, type HealthSyncSnapshot } from "@/lib/healthkit";
import { addManualActivity, loadManualActivities, removeManualActivity, summariseManualActivities, type ManualActivity } from "@/lib/manual-activities";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const storageKey = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");
type ActivityType = "Strength" | "Cardio" | "Run" | "Walk" | "Cycle" | "Other activity";

export default function ActivityScreen() {
  const { type: requestedType } = useLocalSearchParams<{ type?: string }>();
  const { user } = useAuth({ autoFetch: false });
  const userKey = storageKey(user);
  const [health, setHealth] = useState<HealthSyncSnapshot | null>(null);
  const [manualActivities, setManualActivities] = useState<ManualActivity[]>([]);
  const activityTypes: ActivityType[] = ["Strength", "Cardio", "Run", "Walk", "Cycle", "Other activity"];
  const [activityType, setActivityType] = useState<ActivityType>(activityTypes.includes(requestedType as ActivityType) ? requestedType as ActivityType : "Strength");
  const [minutes, setMinutes] = useState("");
  const [calories, setCalories] = useState("");
  const [feedback, setFeedback] = useState("");
  const [logged, setLogged] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      try {
        const savedActivities = await loadManualActivities(userKey);
        if (active) setManualActivities(savedActivities);
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
  const totalCalories = (summary?.activeEnergyKcal ?? 0) + manualSummary.calories;
  const hasCalories = summary?.activeEnergyKcal !== undefined || manualSummary.calories > 0;

  const deleteActivity = async (activityId: string) => {
    const updated = await removeManualActivity(userKey, activityId);
    setManualActivities(updated);
    setLogged(false);
    setFeedback("Activity removed and today’s totals updated.");
  };

  const selectActivity = (type: ActivityType) => {
    setActivityType(type);
    setLogged(false);
    setFeedback(`${type} selected. Add the time you completed, then save it to today’s activity.`);
  };

  const saveActivity = async () => {
    const duration = Number(minutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      setLogged(false);
      setFeedback("Add the minutes completed before saving this activity.");
      return;
    }

    const calorieValue = calories.trim() ? Number(calories) : undefined;
    if (calorieValue !== undefined && (!Number.isFinite(calorieValue) || calorieValue < 0)) {
      setLogged(false);
      setFeedback("Calories must be a zero or positive number, or left blank.");
      return;
    }

    const updated = await addManualActivity(userKey, {
      type: activityType,
      minutes: duration,
      calories: calorieValue,
    });
    setManualActivities(updated);
    setLogged(true);
    setMinutes("");
    setCalories("");
    setFeedback(
      `${activityType} saved for today: ${duration} minute${duration === 1 ? "" : "s"}${calorieValue === undefined ? "" : ` · ${calorieValue} calories noted`}.`,
    );
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>ACTIVITY</Text>
        <Text style={styles.title}>Your movement, your way.</Text>
        <Text style={styles.subtitle}>
          See what Apple Health shares and add activities manually when they happen outside the data we can read.
        </Text>

        <View style={styles.grid}>
          <Stat icon="figure.walk" label="Steps" value={summary?.steps === undefined ? "—" : Math.round(summary.steps).toLocaleString("en-AU")} note={connected ? "From Apple Health" : "Connect Apple Health"} />
          <Stat icon="flame.fill" label="Calories burned" value={hasCalories ? `${Math.round(totalCalories)} kcal` : "—"} note={manualSummary.calories > 0 ? "Apple Health + manual entries" : connected ? "From Apple Health" : "Waiting for activity"} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add an activity</Text>
          <Text style={styles.cardCopy}>
            Choose the activity first, then record the time you completed. VELTURA will not invent calories when none are available.
          </Text>

          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Minutes</Text>
              <TextInput
                value={minutes}
                onChangeText={(value) => {
                  setMinutes(value);
                  setLogged(false);
                  setFeedback("");
                }}
                style={styles.input}
                placeholder="30"
                placeholderTextColor="#718071"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Calories (optional)</Text>
              <TextInput
                value={calories}
                onChangeText={(value) => {
                  setCalories(value);
                  setLogged(false);
                  setFeedback("");
                }}
                style={styles.input}
                placeholder="—"
                placeholderTextColor="#718071"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.choiceRow}>
            {activityTypes.map((type) => {
              const selected = activityType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => selectActivity(type)}
                  style={({ pressed }) => [
                    selected ? styles.choiceActive : styles.choice,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Select ${type}`}
                >
                  <Text style={selected ? styles.choiceActiveText : styles.choiceText}>{type}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() => void saveActivity()}
            accessibilityRole="button"
            accessibilityLabel={`Save ${activityType} activity`}
          >
            <Text style={styles.buttonText}>{logged ? "Activity logged" : `Save ${activityType.toLowerCase()}`}</Text>
          </Pressable>
          {feedback ? <Text style={logged ? styles.success : styles.feedback}>{feedback}</Text> : null}
        </View>

        {manualSummary.entries.length > 0 ? <View style={styles.activityList}>
          <Text style={styles.infoTitle}>Today’s manual activity</Text>
          <Text style={styles.infoCopy}>{manualSummary.entries.length} entr{manualSummary.entries.length === 1 ? "y" : "ies"} · {Math.round(manualSummary.minutes)} min{manualSummary.calories > 0 ? ` · ${Math.round(manualSummary.calories)} kcal` : ""}</Text>
          {[...manualSummary.entries].reverse().map((activity) => <View key={activity.id} style={styles.activityRow}>
            <View style={styles.activityBody}>
              <Text style={styles.activityTitle}>{activity.type} · {Math.round(activity.minutes)} min</Text>
              <Text style={styles.activityMeta}>{activity.calories === undefined ? "No calories entered" : `${Math.round(activity.calories)} kcal`} · {new Date(activity.createdAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</Text>
            </View>
            <Pressable onPress={() => void deleteActivity(activity.id)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Delete ${activity.type} activity`}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>)}
        </View> : null}

        <View style={styles.info}>
          <Text style={styles.infoTitle}>No data is a valid state</Text>
          <Text style={styles.infoCopy}>
            VELTURA won’t invent burned calories or steps. Connect Apple Health or add a session manually when you know what you did.
          </Text>
        </View>
        <Text style={styles.note}>
          Calorie estimates vary by person and activity. Treat them as estimates, not a target to “earn” or “cancel out” food.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ icon, label, value, note }: { icon: any; label: string; value: string; note: string }) {
  return (
    <View style={styles.stat}>
      <IconSymbol name={icon} size={20} color={mint} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 16 },
  back: { color: mint, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  eyebrow: { color: mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", gap: 10, marginTop: 5 },
  stat: { flex: 1, minHeight: 135, backgroundColor: "#1B231D", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#263128" },
  label: { color: muted, fontSize: 12, fontWeight: "700", marginTop: 12 },
  value: { color: "#F4F7F0", fontSize: 28, fontWeight: "800", marginTop: 7 },
  statNote: { color: muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  card: { backgroundColor: "#1B231D", borderRadius: 20, padding: 17, gap: 13, borderWidth: 1, borderColor: "#2D392E" },
  cardTitle: { color: "#F4F7F0", fontSize: 17, fontWeight: "800" },
  cardCopy: { color: muted, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: "row", gap: 10 },
  inputWrap: { flex: 1, gap: 7 },
  input: { backgroundColor: "#111513", borderRadius: 13, borderWidth: 1, borderColor: "#2D392E", padding: 13, color: "#F4F7F0", fontWeight: "800" },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, backgroundColor: "#111513", borderWidth: 1, borderColor: "#2D392E" },
  choiceActive: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, backgroundColor: "#2C3B25", borderWidth: 1, borderColor: mint },
  choiceText: { color: muted, fontSize: 12, fontWeight: "700" },
  choiceActiveText: { color: mint, fontSize: 12, fontWeight: "800" },
  button: { backgroundColor: mint, padding: 15, borderRadius: 15, alignItems: "center" },
  buttonText: { color: "#111513", fontWeight: "800" },
  feedback: { color: "#FFD166", fontSize: 12, lineHeight: 17 },
  success: { color: mint, fontSize: 12, lineHeight: 17 },
  info: { padding: 16, backgroundColor: "#202A21", borderRadius: 18, borderWidth: 1, borderColor: "#354536" },
  activityList: { padding: 16, gap: 10, backgroundColor: "#202A21", borderRadius: 18, borderWidth: 1, borderColor: "#354536" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#354536" },
  activityBody: { flex: 1 },
  activityTitle: { color: "#F4F7F0", fontSize: 13, fontWeight: "800" },
  activityMeta: { color: muted, fontSize: 11, marginTop: 3 },
  deleteButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: "#3A252B" },
  deleteText: { color: "#F49AB5", fontSize: 11, fontWeight: "800" },
  infoTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" },
  infoCopy: { color: muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
