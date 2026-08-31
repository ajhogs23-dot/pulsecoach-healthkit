import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { loadHealthSnapshot } from "@/lib/healthkit";

const mint = "#B8F36B";
const muted = "#A8B3A6";
type Point = LatLng & { altitude: number; timestamp: number };
type WalkState = "ready" | "walking" | "paused" | "finished";
type MetricKey = "steps" | "distance" | "pace" | "duration" | "calories" | "elevation" | "active" | "streak" | "heart" | "split" | "cadence" | "route";
type SavedWalk = { id: string; completedAt: string; seconds: number; steps: number; distanceMetres: number; elevationGain: number; elevationLoss: number; activeSeconds: number; heartRate?: number; calories: number; points: Point[] };
const defaultMetrics: MetricKey[] = ["steps", "distance", "pace", "duration", "calories", "route"];
const allMetrics: { key: MetricKey; label: string }[] = [{ key: "steps", label: "Steps" }, { key: "distance", label: "Distance" }, { key: "route", label: "Route map" }, { key: "pace", label: "Pace" }, { key: "duration", label: "Duration" }, { key: "calories", label: "Calories" }, { key: "elevation", label: "Elevation" }, { key: "active", label: "Active minutes" }, { key: "streak", label: "Walking streak" }, { key: "heart", label: "Heart rate" }, { key: "split", label: "Split pace" }, { key: "cadence", label: "Cadence" }];
const rad = (value: number) => value * Math.PI / 180;
const metresBetween = (a: Point, b: Point) => { const dLat = rad(b.latitude - a.latitude); const dLon = rad(b.longitude - a.longitude); const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2; return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)); };
const clock = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const pace = (seconds: number, metres: number) => { if (metres < 10) return "—"; const value = seconds / (metres / 1000); return `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, "0")}`; };

export default function WalkScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = user?.openId ?? (user?.id ? String(user.id) : "local-user");
  const preferenceKey = `pulsecoach.walkMetrics.${userKey}`;
  const historyKey = `pulsecoach.walks.${userKey}`;
  const [state, setState] = useState<WalkState>("ready");
  const [points, setPoints] = useState<Point[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [steps, setSteps] = useState(0);
  const [heartRate, setHeartRate] = useState<number>();
  const [weightKg, setWeightKg] = useState(75);
  const [streak, setStreak] = useState(0);
  const [visible, setVisible] = useState<MetricKey[]>(defaultMetrics);
  const [customizing, setCustomizing] = useState(false);
  const [status, setStatus] = useState("Finding your location…");
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const stepWatcher = useRef<{ remove: () => void } | null>(null);
  const map = useRef<MapView | null>(null);

  useEffect(() => {
    void Promise.all([loadHealthSnapshot(userKey), AsyncStorage.getItem(preferenceKey), AsyncStorage.getItem(historyKey)]).then(([health, preferences, rawHistory]) => {
      setHeartRate(health.summary?.heartRateAverage); if (health.summary?.weightKg) setWeightKg(health.summary.weightKg);
      if (preferences) { try { const parsed = JSON.parse(preferences); if (Array.isArray(parsed)) setVisible(parsed); } catch { /* defaults remain */ } }
      try { setStreak(calculateStreak(rawHistory ? JSON.parse(rawHistory) : [])); } catch { setStreak(0); }
    });
    void Location.requestForegroundPermissionsAsync().then(async ({ status: permission }) => {
      if (permission !== "granted") return setStatus("Location permission is needed for walk distance and route mapping.");
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPoints([{ latitude: current.coords.latitude, longitude: current.coords.longitude, altitude: current.coords.altitude ?? 0, timestamp: current.timestamp }]); setStatus("GPS and pedometer ready");
    }).catch(() => setStatus("Location is currently unavailable."));
    return () => { locationWatcher.current?.remove(); stepWatcher.current?.remove(); };
  }, [historyKey, preferenceKey, userKey]);

  useEffect(() => { if (state !== "walking") return; const timer = setInterval(() => setSeconds((value) => value + 1), 1000); return () => clearInterval(timer); }, [state]);
  const distanceMetres = useMemo(() => points.slice(1).reduce((total, point, index) => total + metresBetween(points[index], point), 0), [points]);
  const elevationGain = useMemo(() => points.slice(1).reduce((total, point, index) => total + Math.max(0, point.altitude - points[index].altitude), 0), [points]);
  const elevationLoss = useMemo(() => points.slice(1).reduce((total, point, index) => total + Math.max(0, points[index].altitude - point.altitude), 0), [points]);
  const activeSeconds = useMemo(() => points.slice(1).reduce((total, point, index) => { const elapsed = Math.max(0, (point.timestamp - points[index].timestamp) / 1000); const speed = metresBetween(points[index], point) / Math.max(1, elapsed); return total + (speed >= 1.2 ? elapsed : 0); }, 0), [points]);
  const speedKmh = seconds ? distanceMetres / 1000 / (seconds / 3600) : 0;
  const met = speedKmh < 3.2 ? 2.5 : speedKmh < 4.8 ? 3.3 : speedKmh < 6.4 ? 4.3 : 5;
  const calories = Math.round((met * 3.5 * weightKg / 200) * (seconds / 60) * (1 + Math.min(0.2, elevationGain / 1000)));
  const cadence = seconds ? Math.round(steps / (seconds / 60)) : 0;
  const splitNumber = Math.floor(distanceMetres / 1000) + 1;

  const begin = async () => {
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (locationPermission.status !== "granted") return Alert.alert("Location needed", "Enable location so VELTURA can measure this walk and draw its route.");
    if (!(await Pedometer.isAvailableAsync())) setStatus("GPS is active. This iPhone did not make live pedometer steps available.");
    else { stepWatcher.current?.remove(); stepWatcher.current = Pedometer.watchStepCount(({ steps: count }) => setSteps(count)); }
    locationWatcher.current?.remove();
    locationWatcher.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 }, (position) => { const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, altitude: position.coords.altitude ?? 0, timestamp: position.timestamp }; setPoints((current) => current.length && metresBetween(current.at(-1)!, next) < 2 ? current : [...current, next]); map.current?.animateCamera({ center: next }, { duration: 350 }); });
    setState("walking");
  };
  const pause = () => { locationWatcher.current?.remove(); stepWatcher.current?.remove(); locationWatcher.current = null; stepWatcher.current = null; setState("paused"); };
  const finish = async () => {
    locationWatcher.current?.remove(); stepWatcher.current?.remove();
    const raw = await AsyncStorage.getItem(historyKey); const current: SavedWalk[] = raw ? JSON.parse(raw) : [];
    const saved: SavedWalk = { id: String(Date.now()), completedAt: new Date().toISOString(), seconds, steps, distanceMetres, elevationGain, elevationLoss, activeSeconds, heartRate, calories, points };
    const next = [...current, saved]; await AsyncStorage.setItem(historyKey, JSON.stringify(next)); setStreak(calculateStreak(next)); setState("finished");
  };
  const toggleMetric = async (key: MetricKey) => { const next = visible.includes(key) ? visible.filter((item) => item !== key) : [...visible, key]; setVisible(next); await AsyncStorage.setItem(preferenceKey, JSON.stringify(next)); };
  const value = (key: MetricKey) => ({ steps: [steps.toLocaleString("en-AU"), "walk steps"], distance: [(distanceMetres / 1000).toFixed(2), "km"], pace: [pace(seconds, distanceMetres), "min/km"], duration: [clock(seconds), ""], calories: [String(calories), "kcal est."], elevation: [`+${Math.round(elevationGain)} / −${Math.round(elevationLoss)}`, "metres"], active: [String(Math.floor(activeSeconds / 60)), "brisk min"], streak: [String(streak), streak === 1 ? "day" : "days"], heart: [heartRate ? String(Math.round(heartRate)) : "—", "bpm"], split: [pace(seconds, distanceMetres), `km ${splitNumber}`], cadence: [cadence ? String(cadence) : "—", "steps/min"], route: ["", ""] }[key]);
  const region = points.length ? { latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 } : { latitude: -29.7387, longitude: 151.7385, latitudeDelta: 0.04, longitudeDelta: 0.04 };

  return <ScreenContainer className="px-5 pt-4"><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Workout</Text></Pressable><View><Text style={styles.eyebrow}>OUTDOOR WALK</Text><Text style={styles.title}>{state === "ready" ? "Ready to walk?" : state === "walking" ? "Walk in progress" : state === "paused" ? "Walk paused" : "Walk complete"}</Text><Text style={styles.subtitle}>{status}</Text></View>
    <Pressable style={styles.customize} onPress={() => setCustomizing(true)}><Text style={styles.customizeText}>Customize stats</Text><Text style={styles.customizeCount}>{visible.length} shown</Text></Pressable>
    {visible.includes("route") ? <View style={styles.mapCard}><MapView ref={map} style={styles.map} initialRegion={region} showsUserLocation followsUserLocation={state === "walking"}>{points.length > 1 ? <Polyline coordinates={points} strokeColor={mint} strokeWidth={5} /> : null}{points.length ? <Marker coordinate={points[0]} title="Start" pinColor={mint} /> : null}</MapView></View> : null}
    <View style={styles.grid}>{allMetrics.filter(({ key }) => key !== "route" && visible.includes(key)).map(({ key, label }) => { const [metricValue, unit] = value(key); return <View style={styles.stat} key={key}><Text style={styles.statLabel}>{label.toUpperCase()}</Text><Text style={styles.statValue}>{metricValue}</Text><Text style={styles.statUnit}>{unit}</Text></View>; })}</View>
    {state === "ready" ? <Pressable style={styles.start} onPress={() => void begin()}><Text style={styles.startText}>Start walk</Text></Pressable> : null}
    {state === "walking" ? <View style={styles.actions}><Pressable style={styles.secondary} onPress={pause}><Text style={styles.secondaryText}>Pause</Text></Pressable><Pressable style={styles.finish} onPress={() => void finish()}><Text style={styles.finishText}>Finish</Text></Pressable></View> : null}
    {state === "paused" ? <View style={styles.actions}><Pressable style={styles.startSmall} onPress={() => void begin()}><Text style={styles.startText}>Resume</Text></Pressable><Pressable style={styles.finish} onPress={() => void finish()}><Text style={styles.finishText}>Finish</Text></Pressable></View> : null}
    {state === "finished" ? <View style={styles.saved}><Text style={styles.savedTitle}>Walk saved</Text><Text style={styles.savedCopy}>This walk is separate from your Home screen daily steps and is now available in History.</Text></View> : null}
    <Text style={styles.note}>Walk steps count only while this workout is active. Calories are an estimate using available weight, speed, duration and elevation—not a medical measurement.</Text>
  </ScrollView>
  <Modal visible={customizing} transparent animationType="slide" onRequestClose={() => setCustomizing(false)}><View style={styles.modalShade}><View style={styles.modal}><View style={styles.modalTop}><View><Text style={styles.modalTitle}>Customize walk stats</Text><Text style={styles.modalCopy}>Tap to add or remove a display.</Text></View><Pressable onPress={() => setCustomizing(false)}><Text style={styles.done}>Done</Text></Pressable></View><View style={styles.metricChoices}>{allMetrics.map(({ key, label }) => <Pressable key={key} onPress={() => void toggleMetric(key)} style={[styles.metricChoice, visible.includes(key) && styles.metricChoiceActive]}><Text style={[styles.metricChoiceText, visible.includes(key) && styles.metricChoiceTextActive]}>{visible.includes(key) ? "✓ " : "+ "}{label}</Text></Pressable>)}</View><Text style={styles.modalNote}>VO₂ max and training load are intentionally not estimated from a phone-only walk because they can be misleading without suitable wearable data.</Text></View></View></Modal>
  </ScreenContainer>;
}

function calculateStreak(walks: SavedWalk[]) { const days = new Set(walks.map((walk) => new Date(walk.completedAt).toISOString().slice(0, 10))); let value = 0; const cursor = new Date(); while (days.has(cursor.toISOString().slice(0, 10))) { value += 1; cursor.setDate(cursor.getDate() - 1); } return value; }
const styles = StyleSheet.create({ content: { gap: 14, paddingBottom: 34 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" }, subtitle: { color: muted, fontSize: 13, marginTop: 4 }, customize: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#202A21", borderRadius: 13, padding: 12, borderWidth: 1, borderColor: "#455A3B" }, customizeText: { color: mint, fontWeight: "900", fontSize: 12 }, customizeCount: { color: muted, fontSize: 11 }, mapCard: { height: 260, borderRadius: 19, overflow: "hidden", borderWidth: 1, borderColor: "#344337" }, map: { flex: 1 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 9 }, stat: { width: "48.5%", minHeight: 100, borderRadius: 15, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#2D392E", padding: 13 }, statLabel: { color: muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, statValue: { color: "#F4F7F0", fontSize: 24, fontWeight: "900", marginTop: 9 }, statUnit: { color: mint, fontSize: 10, marginTop: 2 }, start: { backgroundColor: mint, borderRadius: 18, padding: 18, alignItems: "center" }, startSmall: { flex: 1, backgroundColor: mint, borderRadius: 17, padding: 17, alignItems: "center" }, startText: { color: "#111513", fontSize: 16, fontWeight: "900" }, actions: { flexDirection: "row", gap: 10 }, secondary: { flex: 1, backgroundColor: "#2B3B27", borderRadius: 17, padding: 17, alignItems: "center" }, secondaryText: { color: mint, fontWeight: "900" }, finish: { flex: 1, backgroundColor: "#542B2B", borderRadius: 17, padding: 17, alignItems: "center" }, finishText: { color: "#FFB4AB", fontWeight: "900" }, saved: { backgroundColor: "#203022", borderRadius: 15, padding: 14, borderWidth: 1, borderColor: "#49653F" }, savedTitle: { color: mint, fontWeight: "900" }, savedCopy: { color: muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, note: { color: "#718071", fontSize: 10, lineHeight: 15 }, modalShade: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" }, modal: { backgroundColor: "#171E19", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 21, gap: 17 }, modalTop: { flexDirection: "row", justifyContent: "space-between" }, modalTitle: { color: "#F4F7F0", fontSize: 20, fontWeight: "900" }, modalCopy: { color: muted, fontSize: 11, marginTop: 4 }, done: { color: mint, fontWeight: "900" }, metricChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metricChoice: { borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#354137", backgroundColor: "#202722" }, metricChoiceActive: { backgroundColor: "#2B3B27", borderColor: mint }, metricChoiceText: { color: muted, fontSize: 11, fontWeight: "800" }, metricChoiceTextActive: { color: mint }, modalNote: { color: "#718071", fontSize: 9, lineHeight: 14 } });
