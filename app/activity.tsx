import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

const mint = "#B8F36B";
const muted = "#A8B3A6";
type ActivityType = "Strength" | "Cardio" | "Walk";

export default function ActivityScreen() {
  const [activityType, setActivityType] = useState<ActivityType>("Strength");
  const [minutes, setMinutes] = useState("");
  const [calories, setCalories] = useState("");
  const [feedback, setFeedback] = useState("");
  const [logged, setLogged] = useState(false);

  const selectActivity = (type: ActivityType) => {
    setActivityType(type);
    setLogged(false);
    setFeedback(`${type} selected. Add the time you completed, then save it to today’s activity.`);
  };

  const saveActivity = () => {
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

    setLogged(true);
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
          <Stat icon="figure.walk" label="Steps" value="—" note="Connect Apple Health" />
          <Stat icon="flame.fill" label="Calories burned" value="—" note="Waiting for activity" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add an activity</Text>
          <Text style={styles.cardCopy}>
            Choose the activity first, then record the time you completed. PulseCoach will not invent calories when none are available.
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
            {(["Strength", "Cardio", "Walk"] as ActivityType[]).map((type) => {
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
            onPress={saveActivity}
            accessibilityRole="button"
            accessibilityLabel={`Save ${activityType} activity`}
          >
            <Text style={styles.buttonText}>{logged ? "Activity logged" : `Save ${activityType.toLowerCase()}`}</Text>
          </Pressable>
          {feedback ? <Text style={logged ? styles.success : styles.feedback}>{feedback}</Text> : null}
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>No data is a valid state</Text>
          <Text style={styles.infoCopy}>
            PulseCoach won’t invent burned calories or steps. Connect Apple Health or add a session manually when you know what you did.
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
  infoTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "800" },
  infoCopy: { color: muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  note: { color: "#718071", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
