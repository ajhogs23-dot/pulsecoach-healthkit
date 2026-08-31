import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";
import { captureRef } from "react-native-view-shot";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { loadCompletedWorkouts, type CompletedWorkout } from "@/lib/workout-log";

const mint = "#B8F36B";
const muted = "#A8B3A6";
type RunPoint = LatLng & { altitude: number; timestamp: number };
type SavedRun = { id: string; completedAt: string; seconds: number; distanceMetres: number; elevationGain: number; elevationLoss: number; heartRate?: number; points: RunPoint[]; activity?: "Run" | "Walk"; steps?: number; calories?: number };
type Filter = "All" | "Runs" | "Walks" | "Workouts";
const runKey = (userKey: string) => `pulsecoach.runs.${userKey}`;
const walkKey = (userKey: string) => `pulsecoach.walks.${userKey}`;
const date = (value: string) => new Date(value).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const duration = (seconds: number) => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ""}${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
const pace = (seconds: number, metres: number) => metres > 0 ? `${Math.floor(seconds / (metres / 1000) / 60)}:${String(Math.round(seconds / (metres / 1000) % 60)).padStart(2, "0")} /km` : "—";

export default function HistoryScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = user?.openId ?? (user?.id ? String(user.id) : "local-user");
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [workouts, setWorkouts] = useState<CompletedWorkout[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [openRun, setOpenRun] = useState<string>();
  const [openWorkout, setOpenWorkout] = useState<string>();
  const [sharingRun, setSharingRun] = useState<SavedRun>();
  const shareCard = useRef<View>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(runKey(userKey)), AsyncStorage.getItem(walkKey(userKey)), loadCompletedWorkouts(userKey)]).then(([rawRuns, rawWalks, savedWorkouts]) => {
      if (!active) return;
      try { const savedRuns: SavedRun[] = rawRuns ? JSON.parse(rawRuns) : []; const savedWalks: SavedRun[] = rawWalks ? JSON.parse(rawWalks) : []; setRuns([...savedRuns.map((item) => ({ ...item, activity: "Run" as const })), ...savedWalks.map((item) => ({ ...item, activity: "Walk" as const }))]); } catch { setRuns([]); }
      setWorkouts(savedWorkouts);
    });
    return () => { active = false; };
  }, [userKey]));

  const shareRun = async (run: SavedRun) => {
    setSharingRun(run);
    await new Promise((resolve) => setTimeout(resolve, 80));
    if (!shareCard.current || !(await Sharing.isAvailableAsync())) return;
    const uri = await captureRef(shareCard, { format: "png", quality: 1, result: "tmpfile" });
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share your VELTURA run" });
  };

  const shareWorkout = async (workout: CompletedWorkout) => {
    const sets = workout.exercises.reduce((total, exercise) => total + exercise.completedSets.length, 0);
    await Share.share({ message: `VELTURA workout · ${workout.title}\n${workout.durationMinutes} min · ${workout.exercises.length} exercises · ${sets} sets\nCompleted ${date(workout.completedAt)}` });
  };

  const entries = [
    ...(filter !== "Workouts" ? runs.filter((run) => filter === "All" || (filter === "Runs" ? run.activity !== "Walk" : run.activity === "Walk")).map((run) => ({ kind: "run" as const, at: run.completedAt, run })) : []),
    ...(filter === "All" || filter === "Workouts" ? workouts.map((workout) => ({ kind: "workout" as const, at: workout.completedAt, workout })) : []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Workout</Text></Pressable>
      <View><Text style={styles.eyebrow}>HISTORY</Text><Text style={styles.title}>Everything you’ve done.</Text><Text style={styles.subtitle}>Review past runs and workouts. Sharing is always your choice, and route maps remain private on the share card.</Text></View>
      <View style={styles.filters}>{(["All", "Runs", "Walks", "Workouts"] as Filter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</View>
      {!entries.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your history starts here.</Text><Text style={styles.emptyCopy}>Finish a run or workout and it will appear here automatically.</Text></View> : null}

      {entries.map((entry) => entry.kind === "run" ? <View key={`run-${entry.run.id}`} style={styles.card}>
        <Pressable style={styles.cardTop} onPress={() => setOpenRun(openRun === entry.run.id ? undefined : entry.run.id)}>
          <View style={styles.icon}><IconSymbol name={entry.run.activity === "Walk" ? "figure.walk" : "figure.run"} size={22} color={mint} /></View><View style={styles.flex}><Text style={styles.cardTitle}>Outdoor {entry.run.activity === "Walk" ? "walk" : "run"}</Text><Text style={styles.cardMeta}>{date(entry.run.completedAt)} · {(entry.run.distanceMetres / 1000).toFixed(2)} km · {duration(entry.run.seconds)}</Text></View><IconSymbol name="chevron.right" size={18} color={muted} />
        </Pressable>
        {openRun === entry.run.id ? <View style={styles.details}>
          {entry.run.points.length ? <MapView style={styles.map} initialRegion={{ latitude: entry.run.points[0].latitude, longitude: entry.run.points[0].longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 }} scrollEnabled={false} zoomEnabled={false}><Polyline coordinates={entry.run.points} strokeColor={mint} strokeWidth={4} /><Marker coordinate={entry.run.points[0]} title="Start" pinColor={mint} /></MapView> : null}
          <View style={styles.runStats}><Mini label="Distance" value={`${(entry.run.distanceMetres / 1000).toFixed(2)} km`} /><Mini label="Time" value={duration(entry.run.seconds)} /><Mini label="Avg pace" value={pace(entry.run.seconds, entry.run.distanceMetres)} />{entry.run.activity === "Walk" ? <Mini label="Walk steps" value={(entry.run.steps ?? 0).toLocaleString("en-AU")} /> : <Mini label="Heart rate" value={entry.run.heartRate ? `${Math.round(entry.run.heartRate)} bpm` : "—"} />}<Mini label="Elevation +" value={`${Math.round(entry.run.elevationGain)} m`} /><Mini label="Elevation −" value={`${Math.round(entry.run.elevationLoss)} m`} /></View>
          <Pressable style={styles.share} onPress={() => void shareRun(entry.run)}><IconSymbol name="square.and.arrow.up" size={17} color="#111513" /><Text style={styles.shareText}>Share {entry.run.activity === "Walk" ? "walk" : "run"}</Text></Pressable><Text style={styles.private}>The shared image includes stats, not your route or location.</Text>
        </View> : null}
      </View> : <View key={`workout-${entry.workout.id}`} style={styles.card}>
        <Pressable style={styles.cardTop} onPress={() => setOpenWorkout(openWorkout === entry.workout.id ? undefined : entry.workout.id)}><View style={styles.icon}><IconSymbol name="dumbbell.fill" size={21} color={mint} /></View><View style={styles.flex}><Text style={styles.cardTitle}>{entry.workout.title}</Text><Text style={styles.cardMeta}>{date(entry.workout.completedAt)} · {entry.workout.durationMinutes} min · {entry.workout.exercises.length} exercises</Text></View><IconSymbol name="chevron.right" size={18} color={muted} /></Pressable>
        {openWorkout === entry.workout.id ? <View style={styles.details}>{entry.workout.exercises.map((exercise) => <View key={exercise.name} style={styles.exercise}><View style={styles.flex}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{exercise.focus}</Text></View><Text style={styles.sets}>{exercise.completedSets.length} sets</Text></View>)}<Pressable style={styles.share} onPress={() => void shareWorkout(entry.workout)}><IconSymbol name="square.and.arrow.up" size={17} color="#111513" /><Text style={styles.shareText}>Share workout</Text></Pressable></View> : null}
      </View>)}
    </ScrollView>
    <View ref={shareCard} collapsable={false} pointerEvents="none" style={styles.shareCard}><Text style={styles.shareBrand}>VELTURA</Text><Text style={styles.shareTitle}>Outdoor {sharingRun?.activity === "Walk" ? "walk" : "run"}</Text><Text style={styles.shareDate}>{sharingRun ? date(sharingRun.completedAt) : ""}</Text><View style={styles.shareGrid}><ShareStat label="DISTANCE" value={sharingRun ? `${(sharingRun.distanceMetres / 1000).toFixed(2)} km` : "—"} /><ShareStat label="TIME" value={sharingRun ? duration(sharingRun.seconds) : "—"} /><ShareStat label="AVG PACE" value={sharingRun ? pace(sharingRun.seconds, sharingRun.distanceMetres) : "—"} /><ShareStat label={sharingRun?.activity === "Walk" ? "WALK STEPS" : "HEART RATE"} value={sharingRun?.activity === "Walk" ? (sharingRun.steps ?? 0).toLocaleString("en-AU") : sharingRun?.heartRate ? `${Math.round(sharingRun.heartRate)} bpm` : "—"} /></View><Text style={styles.shareFooter}>Strong body. Clear mind. Keep moving.</Text></View>
  </ScreenContainer>;
}

function Mini({ label, value }: { label: string; value: string }) { return <View style={styles.mini}><Text style={styles.miniLabel}>{label}</Text><Text style={styles.miniValue}>{value}</Text></View>; }
function ShareStat({ label, value }: { label: string; value: string }) { return <View style={styles.shareStat}><Text style={styles.shareStatLabel}>{label}</Text><Text style={styles.shareStatValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" }, subtitle: { color: muted, fontSize: 13, lineHeight: 19, marginTop: 5 }, filters: { flexDirection: "row", gap: 8 }, filter: { flex: 1, borderRadius: 12, padding: 11, alignItems: "center", backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#2D392E" }, filterActive: { backgroundColor: mint, borderColor: mint }, filterText: { color: muted, fontWeight: "800", fontSize: 12 }, filterTextActive: { color: "#111513" }, empty: { padding: 20, borderRadius: 17, backgroundColor: "#1B231D" }, emptyTitle: { color: "#F4F7F0", fontWeight: "900", fontSize: 16 }, emptyCopy: { color: muted, fontSize: 12, marginTop: 5 }, card: { borderRadius: 17, backgroundColor: "#1B231D", borderWidth: 1, borderColor: "#2D392E", overflow: "hidden" }, cardTop: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 }, icon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#2B3B27", alignItems: "center", justifyContent: "center" }, flex: { flex: 1 }, cardTitle: { color: "#F4F7F0", fontSize: 15, fontWeight: "900" }, cardMeta: { color: muted, fontSize: 10.5, marginTop: 4 }, details: { gap: 10, padding: 13, borderTopWidth: 1, borderTopColor: "#2D392E" }, map: { height: 190, borderRadius: 14, overflow: "hidden" }, runStats: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }, mini: { width: "32%", backgroundColor: "#222C24", borderRadius: 11, padding: 9 }, miniLabel: { color: muted, fontSize: 8, fontWeight: "800" }, miniValue: { color: "#F4F7F0", fontSize: 12, fontWeight: "900", marginTop: 4 }, share: { flexDirection: "row", gap: 7, justifyContent: "center", alignItems: "center", borderRadius: 13, padding: 13, backgroundColor: mint }, shareText: { color: "#111513", fontWeight: "900" }, private: { color: "#718071", textAlign: "center", fontSize: 9 }, exercise: { flexDirection: "row", alignItems: "center", paddingVertical: 7 }, exerciseName: { color: "#F4F7F0", fontSize: 12, fontWeight: "800" }, exerciseMeta: { color: muted, fontSize: 10, marginTop: 2 }, sets: { color: mint, fontSize: 11, fontWeight: "800" }, shareCard: { position: "absolute", left: -2000, width: 1080, height: 1350, padding: 85, backgroundColor: "#111513", justifyContent: "center" }, shareBrand: { color: mint, fontSize: 32, fontWeight: "900", letterSpacing: 5 }, shareTitle: { color: "#F4F7F0", fontSize: 72, fontWeight: "900", marginTop: 28 }, shareDate: { color: muted, fontSize: 28, marginTop: 12 }, shareGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 25, marginTop: 60 }, shareStat: { width: "48%", padding: 30, borderRadius: 28, backgroundColor: "#1B231D", borderWidth: 2, borderColor: "#334235" }, shareStatLabel: { color: muted, fontSize: 20, fontWeight: "900", letterSpacing: 2 }, shareStatValue: { color: "#F4F7F0", fontSize: 42, fontWeight: "900", marginTop: 15 }, shareFooter: { color: mint, fontSize: 24, fontWeight: "800", marginTop: 70 }
});
