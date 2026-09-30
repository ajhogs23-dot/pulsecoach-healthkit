import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useNavigation, useFocusEffect } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { activeCalorieTarget, calculateBMI, calculateCalorieEstimate, displayMeasurement, loadCachedProfilePreferences, loadProfilePreferences, parseMeasurement, saveProfilePreferences, validatePersonalDetails, type ProfilePreferences } from "@/lib/profile-preferences";

export default function PersonalDetailsScreen() {
  const { user, loading } = useAuth();
  if (loading) return <ScreenContainer><Text style={styles.copy}>Loading your account...</Text></ScreenContainer>;
  if (!user) return <ScreenContainer><Text style={styles.copy}>Sign in to access your Personal Details.</Text><Pressable onPress={() => router.push("/login")}><Text style={styles.link}>Sign in</Text></Pressable></ScreenContainer>;
  return <DetailsForm key={user.openId} userKey={user.openId} />;
}

function DetailsForm({ userKey }: { userKey: string }) {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<ProfilePreferences>();
  const [saved, setSaved] = useState("");
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const dirtyRef = useRef(false);
  useFocusEffect(useCallback(() => {
    void revision; // Retry explicitly reloads this focused screen.
    mounted.current = true;
    if (dirtyRef.current) return;
    let active = true;
    setLoading(true);
    setMessage("");
    void (async () => {
      let hasCachedProfile = false;
      try {
        const cached = await loadCachedProfilePreferences(userKey);
        if (cached && active && !dirtyRef.current) {
          hasCachedProfile = true;
          setProfile(cached);
          setSaved(JSON.stringify(cached));
          setLoading(false);
        }
      } catch { /* Cache is an optimization; the authenticated refresh remains authoritative. */ }
      try {
        const fresh = await loadProfilePreferencesWithTimeout(userKey);
        if (active && !dirtyRef.current) { setProfile(fresh); setSaved(JSON.stringify(fresh)); }
      } catch {
        if (active && !hasCachedProfile) setMessage("Could not load your details. Check your connection and retry.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; mounted.current = false; };
  }, [userKey, revision]));
  const dirty = Boolean(profile && (JSON.stringify(profile) !== saved || Object.keys(numbers).length));
  dirtyRef.current = dirty;
  usePreventRemove(dirty || saving, ({ data }) => {
    if (saving) return;
    if (Platform.OS === "web") {
      if (window.confirm("Discard unsaved Personal Details changes?")) navigation.dispatch(data.action);
    } else Alert.alert("Unsaved changes", "Discard your changes?", [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) }]);
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  if (!profile) return <ScreenContainer className="px-5 pt-4"><View style={styles.loadState}>
    {loading ? <ActivityIndicator accessibilityLabel="Loading Personal Details" color="#B8F36B" size="large" /> : null}
    <Text style={styles.copy}>{message || "Loading Personal Details..."}</Text>
    {!loading && message ? <View style={styles.loadActions}><Pressable onPress={() => setRevision((value) => value + 1)}><Text style={styles.link}>Retry</Text></Pressable><Pressable onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable></View> : null}
  </View></ScreenContainer>;
  const imperial = profile.unitSystem === "imperial";
  const draft = { ...profile };
  for (const [key, value] of Object.entries(numbers)) {
    const parsed = key === "heightCm" ? parseMeasurement(value, "height", imperial) : key === "weightKg" || key === "targetWeightKg" || key === "progressRate" ? parseMeasurement(value, "weight", imperial) : value.trim() ? Number(value) : undefined;
    Object.assign(draft, { [key]: parsed });
  }
  const update = (key: keyof ProfilePreferences, value: unknown) => { setProfile({ ...profile, [key]: value, ...(key === "currentGym" ? { currentGymId: undefined } : key === "homeGym" ? { homeGymId: undefined } : {}) }); setMessage(""); setErrors({}); };
  const field = (label: string, key: keyof ProfilePreferences, numeric = false) => {
    const value = profile[key] ?? (key === "currentGym" ? profile.currentGymId : key === "homeGym" ? profile.homeGymId : undefined);
    const formatted = key === "heightCm" ? displayMeasurement(value as number | undefined, "height", imperial) : key === "weightKg" || key === "targetWeightKg" || key === "progressRate" ? displayMeasurement(value as number | undefined, "weight", imperial) : value === undefined ? "" : String(value);
    return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} editable={!saving} value={numeric ? numbers[key] ?? formatted : formatted} keyboardType={numeric ? "decimal-pad" : "default"} onChangeText={(text) => { if (numeric) { setNumbers({ ...numbers, [key]: text }); setMessage(""); setErrors({}); } else update(key, text); }} style={[styles.input, errors[key] ? styles.invalid : undefined]} />{errors[key] ? <Text accessibilityRole="alert" style={styles.error}>{errors[key]}</Text> : null}</View>;
  };
  const choices = (label: string, key: keyof ProfilePreferences, items: string[], selected?: string) => <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choices}>{items.map((item) => <Pressable key={item} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: (selected ?? profile[key]) === item }} onPress={() => update(key, item)} style={[styles.choice, (selected ?? profile[key]) === item && styles.selected]}><Text style={styles.copy}>{item}</Text></Pressable>)}</View>{errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}</View>;
  const estimate = calculateCalorieEstimate(draft);
  const bmi = calculateBMI(draft);
  const mode = profile.calorieTargetMode ?? (profile.calorieTarget ? "selected" : "estimated");
  const save = async () => {
    const validation = validatePersonalDetails(draft);
    setErrors(validation);
    if (Object.keys(validation).length) { setMessage("Review the highlighted fields before saving."); return; }
    setSaving(true); setMessage("");
    try {
      const result = await saveProfilePreferences(userKey, draft);
      if (mounted.current) { setProfile(result); setSaved(JSON.stringify(result)); setNumbers({}); setMessage("Personal Details saved."); }
    } catch { if (mounted.current) setMessage("Could not save. Your changes are still here. Check your connection and try again."); }
    finally { if (mounted.current) setSaving(false); }
  };
  return <ScreenContainer className="px-5 pt-4"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable>
    <Text style={styles.title}>Personal Details</Text><Text style={styles.copy}>Private to your account. These details guide nutrition, workouts and coaching.</Text>
    <Card title="Basic information">{field("Name", "name")}{field("Age (18-120 years)", "age", true)}{choices("Sex used for calorie calculations", "sexForEstimate", ["Male", "Female"])}</Card>
    <Card title="Body details"><Text style={styles.label}>Units</Text><View style={styles.choices}>{(["metric", "imperial"] as const).map((unit) => <Pressable key={unit} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: (profile.unitSystem ?? "metric") === unit }} style={[styles.choice, (profile.unitSystem ?? "metric") === unit && styles.selected]} onPress={() => { setProfile({ ...draft, unitSystem: unit }); setNumbers({}); }}><Text style={styles.copy}>{unit === "metric" ? "Metric (cm, kg)" : "Imperial (in, lb)"}</Text></Pressable>)}</View>
      {field(`Height (${imperial ? "inches" : "cm"})`, "heightCm", true)}{field(`Current weight (${imperial ? "lb" : "kg"})`, "weightKg", true)}<Text style={styles.value}>BMI: {bmi ?? "--"}</Text><Text style={styles.copy}>Calculated automatically from your height and current weight.</Text>{field(`Target weight (${imperial ? "lb" : "kg"}, optional)`, "targetWeightKg", true)}</Card>
    <Card title="Goals">{choices("Main goal", "goal", ["Lose fat", "Build strength", "Improve fitness", "Maintain health"])}{choices("Weight target", "weightGoal", ["Weight loss", "Maintenance", "Muscle gain"])}{field(`Desired progress rate (${imperial ? "lb" : "kg"}/week, optional)`, "progressRate", true)}</Card>
    <Card title="Activity profile">{choices("Daily activity level", "activityLevel", ["Sedentary", "Lightly active", "Moderately active", "Very active"])}{field("Work / lifestyle activity", "lifestyleActivity")}{field("Typical exercise days per week (0-7)", "exerciseFrequency", true)}</Card>
    <Card title="Food preferences">{choices("Dietary preferences", "foodPreference", ["No preference", "Vegetarian", "High-protein"])}{field("Allergies or exclusions", "allergies")}{field("Nutrition approach", "nutritionApproach")}</Card>
    <Card title="Training preferences">{field("Training days (e.g. Mon, Wed, Fri)", "trainingDays")}{field("Preferred workout duration (5-180 minutes)", "workoutDuration", true)}{choices("Available equipment", "trainingSetup", ["Dumbbells", "Full gym", "Bodyweight"])}{field("Injuries, pain or movement limitations", "limitations")}{field("Home gym", "homeGym")}{field("Current gym", "currentGym")}<Pressable onPress={() => router.push("/gym-directory")}><Text style={styles.link}>Browse gym directory</Text></Pressable></Card>
    <Card title="Coaching preferences">{choices("Coaching style", "coachingStyle", ["Encouraging", "Direct", "Minimal"])}{field("Humour / personality level", "personality")}{field("Notification preferences", "notifications")}{field("Encouragement preferences", "encouragement")}</Card>
    <Card title="Calorie targets">{field("Your selected daily calorie target (1,200-6,000 kcal)", "calorieTarget", true)}<Text style={styles.value}>PulseCoach estimate: {estimate ? `${estimate.recommendedCalories} kcal/day` : "--"}</Text><Text style={styles.copy}>Estimated maintenance: {estimate ? `${estimate.maintenanceCalories} kcal/day` : "--"}</Text><Text style={styles.copy}>Your selected target is a number you choose. PulseCoach estimates maintenance from age, sex, height, weight and daily activity, then adjusts for your goal and progress rate. The estimate updates as these details change. Selecting it keeps your chosen number for later.</Text>{!estimate && <Text style={styles.copy}>Complete valid sex, age, height and weight to calculate an estimate.</Text>}
      <View style={styles.choices}>{(["selected", "estimated"] as const).map((value) => <Pressable key={value} disabled={saving || (value === "estimated" && !estimate)} accessibilityRole="radio" accessibilityState={{ checked: mode === value, disabled: saving || (value === "estimated" && !estimate) }} style={[styles.choice, mode === value && styles.selected]} onPress={() => update("calorieTargetMode", value)}><Text style={styles.copy}>{value === "selected" ? "Use my selected target" : "Use PulseCoach estimate"}</Text></Pressable>)}</View>
      <Text style={styles.value}>Active target: {activeCalorieTarget(draft) ?? "--"} kcal/day</Text>{errors.calorieTargetMode && <Text style={styles.error}>{errors.calorieTargetMode}</Text>}<Text style={styles.copy}>A starting estimate; actual needs vary. Review it with your progress, energy and professional advice.</Text></Card>
    <Text accessibilityLiveRegion="polite" style={styles.link}>{saving ? "Saving..." : dirty ? "Unsaved changes" : message === "Personal Details saved." ? message : "No unsaved changes"}</Text>
    {message && message !== "Personal Details saved." ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
    <Pressable accessibilityRole="button" disabled={saving || !dirty} style={[styles.save, (saving || !dirty) && { opacity: 0.5 }]} onPress={() => void save()}><Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text></Pressable>
  </ScrollView></ScreenContainer>;
}

async function loadProfilePreferencesWithTimeout(userKey: string): Promise<ProfilePreferences> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loadProfilePreferences(userKey),
      new Promise<ProfilePreferences>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Profile request timed out")), 15_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function Card({ title, children }: { title: string; children: ReactNode }) { return <View style={styles.card}><Text style={styles.heading}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 40 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800" }, heading: { color: "#F4F7F0", fontSize: 18, fontWeight: "800" },
  loadState: { flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", gap: 14 }, loadActions: { flexDirection: "row", gap: 24 },
  card: { gap: 14, padding: 16, borderRadius: 18, backgroundColor: "rgba(76,143,184,0.40)", borderWidth: 1, borderColor: "rgba(174,224,255,0.54)" },
  field: { gap: 7 }, label: { color: "#DFE9DF", fontSize: 13, fontWeight: "700" }, copy: { color: "#C2CEC1", fontSize: 13, lineHeight: 20 }, link: { color: "#B8F36B", fontWeight: "700", paddingVertical: 8 },
  input: { color: "#F4F7F0", padding: 13, minHeight: 46, borderRadius: 12, backgroundColor: "rgba(10,43,67,0.50)", borderWidth: 1, borderColor: "rgba(174,224,255,0.58)" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { borderWidth: 1, borderColor: "#7794A6", padding: 12, borderRadius: 12 }, selected: { borderColor: "#B8F36B", backgroundColor: "#2C3B25" },
  value: { color: "#F4F7F0", fontSize: 17, fontWeight: "700" }, error: { color: "#FFD166", fontSize: 13, lineHeight: 19 }, invalid: { borderColor: "#FFD166" }, save: { padding: 16, alignItems: "center", backgroundColor: "#B8F36B", borderRadius: 15 }, saveText: { color: "#111513", fontWeight: "800" },
});
