import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { heightComparison, saveIndoorCardio, stairHeightMetres, type IndoorCardioType } from "@/lib/indoor-cardio";

const mint = "#B8F36B"; const muted = "#A8B3A6";
const valid: IndoorCardioType[] = ["Treadmill run", "Treadmill walk", "Rowing machine", "Indoor bike", "Stair climber"];
type FieldKey = "minutes" | "distanceKm" | "calories" | "heartRate" | "incline" | "maxIncline" | "strokesPerMinute" | "strokeCount" | "split500mSeconds" | "cadence" | "resistance" | "watts" | "floors" | "steps" | "speedLevel";
const common: [FieldKey, string, string][] = [["minutes", "Time (minutes)", "30"], ["calories", "Calories", "Optional"], ["heartRate", "Average heart rate", "Optional"]];

export default function IndoorCardioScreen() {
  const params = useLocalSearchParams<{ type?: string }>(); const initial = valid.includes(params.type as IndoorCardioType) ? params.type as IndoorCardioType : "Treadmill run";
  const { user } = useAuth({ autoFetch: false }); const userKey = user?.openId ?? (user?.id ? String(user.id) : "local-user");
  const [type, setType] = useState<IndoorCardioType>(initial); const [values, setValues] = useState<Partial<Record<FieldKey, string>>>({}); const [notes, setNotes] = useState(""); const [feedback, setFeedback] = useState("");
  const fields = useMemo(() => {
    if (type.startsWith("Treadmill")) return [...common, ["distanceKm", "Distance (km)", "5.0"], ["incline", "Average incline (%)", "Optional"], ["maxIncline", "Maximum incline (%)", "Optional"]] as [FieldKey, string, string][];
    if (type === "Rowing machine") return [...common, ["distanceKm", "Distance (km)", "5.0"], ["strokesPerMinute", "Strokes per minute", "Optional"], ["split500mSeconds", "500 m split (seconds)", "Optional"], ["strokeCount", "Total strokes", "Optional"], ["watts", "Average power (watts)", "Optional"]] as [FieldKey, string, string][];
    if (type === "Indoor bike") return [...common, ["distanceKm", "Distance (km)", "10.0"], ["cadence", "Cadence (RPM)", "Optional"], ["resistance", "Resistance level", "Optional"], ["watts", "Average power (watts)", "Optional"]] as [FieldKey, string, string][];
    return [...common, ["floors", "Floors climbed", "50"], ["steps", "Steps climbed", "Optional"], ["speedLevel", "Speed level", "Optional"]] as [FieldKey, string, string][];
  }, [type]);
  const floors = Number(values.floors) || 0; const steps = Number(values.steps) || 0; const height = stairHeightMetres(floors, steps);
  const save = async () => {
    const minutes = Number(values.minutes); if (!Number.isFinite(minutes) || minutes <= 0) { setFeedback("Add the time completed before saving."); return; }
    const number = (key: FieldKey) => values[key]?.trim() ? Number(values[key]) : undefined;
    const numeric = fields.filter(([key]) => key !== "minutes").map(([key]) => number(key));
    if (numeric.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) { setFeedback("Use zero or positive numbers, or leave optional fields blank."); return; }
    await saveIndoorCardio(userKey, { type, minutes, distanceKm: number("distanceKm"), calories: number("calories"), heartRate: number("heartRate"), incline: number("incline"), maxIncline: number("maxIncline"), strokesPerMinute: number("strokesPerMinute"), strokeCount: number("strokeCount"), split500mSeconds: number("split500mSeconds"), cadence: number("cadence"), resistance: number("resistance"), watts: number("watts"), floors: number("floors"), steps: number("steps"), heightMetres: type === "Stair climber" ? height : undefined, speedLevel: number("speedLevel"), notes: notes.trim() || undefined });
    setFeedback(`${type} saved to Activity History.`); setValues({}); setNotes("");
  };
  return <ScreenContainer className="px-5 pt-4"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Gym</Text></Pressable><Text style={styles.eyebrow}>INDOOR CARDIO</Text><Text style={styles.title}>{type}</Text><Text style={styles.subtitle}>Enter the machine display after your session. Connected sensors can fill supported measurements in a future sync.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.types}>{valid.map((item) => <Pressable key={item} style={[styles.type, type === item && styles.typeActive]} onPress={() => { setType(item); setValues({}); setFeedback(""); }}><Text style={[styles.typeText, type === item && styles.typeTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    <View style={styles.form}>{fields.map(([key, label, placeholder]) => <View key={key} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={values[key] ?? ""} onChangeText={(value) => { setValues((current) => ({ ...current, [key]: value })); setFeedback(""); }} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor="#718071" style={styles.input} /></View>)}<View style={styles.field}><Text style={styles.label}>Notes (optional)</Text><TextInput value={notes} onChangeText={setNotes} placeholder="How did it feel?" placeholderTextColor="#718071" style={[styles.input, styles.notes]} multiline /></View></View>
    {type === "Stair climber" ? <View style={styles.height}><Text style={styles.heightLabel}>VERTICAL HEIGHT</Text><Text style={styles.heightValue}>{Math.round(height)} m</Text><Text style={styles.heightCopy}>{heightComparison(height)}</Text><Text style={styles.heightNote}>Calculated using 3 m per floor, or 0.17 m per step when floors are not entered.</Text></View> : null}
    <Pressable style={styles.save} onPress={() => void save()}><Text style={styles.saveText}>Save {type.toLowerCase()}</Text></Pressable>{feedback ? <Text style={feedback.includes("saved") ? styles.success : styles.warning}>{feedback}</Text> : null}
  </ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { gap: 14, paddingBottom: 35 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" }, subtitle: { color: muted, lineHeight: 20 }, types: { gap: 8 }, type: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#304033" }, typeActive: { backgroundColor: mint, borderColor: mint }, typeText: { color: muted, fontSize: 11, fontWeight: "800" }, typeTextActive: { color: "#111513" }, form: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, backgroundColor: "#1B231D", padding: 15, borderRadius: 19, borderWidth: 1, borderColor: "#304033" }, field: { width: "48.5%", gap: 6 }, label: { color: "#DCE5D8", fontSize: 10, fontWeight: "800" }, input: { color: "#F4F7F0", backgroundColor: "#111513", borderRadius: 12, borderWidth: 1, borderColor: "#3B4A3B", padding: 12, fontWeight: "800" }, notes: { minHeight: 70, textAlignVertical: "top" }, height: { borderRadius: 19, padding: 17, backgroundColor: "#243020", borderWidth: 1, borderColor: "#4D653D" }, heightLabel: { color: mint, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, heightValue: { color: "#F4F7F0", fontSize: 34, fontWeight: "900", marginTop: 6 }, heightCopy: { color: "#F4F7F0", fontWeight: "800", marginTop: 4 }, heightNote: { color: muted, fontSize: 10, lineHeight: 15, marginTop: 6 }, save: { backgroundColor: mint, padding: 16, borderRadius: 16, alignItems: "center" }, saveText: { color: "#111513", fontWeight: "900" }, success: { color: mint, textAlign: "center", fontWeight: "800" }, warning: { color: "#FFD166", textAlign: "center" } });
