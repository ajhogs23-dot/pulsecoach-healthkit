import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Polyline, type LatLng, Marker } from "react-native-maps";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { loadHealthSnapshot } from "@/lib/healthkit";

const mint = "#B8F36B";
const muted = "#A8B3A6";
type Point = LatLng & { altitude: number; timestamp: number };
type RunState = "ready" | "running" | "paused" | "finished";

const rad = (value: number) => value * Math.PI / 180;
const metresBetween = (a: Point, b: Point) => {
  const earth = 6371000;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};
const clock = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const pace = (seconds: number, metres: number) => {
  if (metres < 10) return "—";
  const secondsPerKm = seconds / (metres / 1000);
  return `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, "0")}`;
};

export default function RunScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = user?.openId ?? (user?.id ? String(user.id) : "local-user");
  const [state, setState] = useState<RunState>("ready");
  const [points, setPoints] = useState<Point[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [heartRate, setHeartRate] = useState<number>();
  const [locationMessage, setLocationMessage] = useState("Finding your location…");
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const map = useRef<MapView | null>(null);

  useEffect(() => {
    void loadHealthSnapshot(userKey).then((snapshot) => setHeartRate(snapshot.summary?.heartRateAverage));
    void Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== "granted") return setLocationMessage("Location permission is needed to draw your route.");
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { latitude: current.coords.latitude, longitude: current.coords.longitude, altitude: current.coords.altitude ?? 0, timestamp: current.timestamp };
      setPoints([point]);
      setLocationMessage("GPS ready");
    }).catch(() => setLocationMessage("Location is currently unavailable."));
    return () => watcher.current?.remove();
  }, [userKey]);

  useEffect(() => {
    if (state !== "running") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const distanceMetres = useMemo(() => points.slice(1).reduce((total, point, index) => total + metresBetween(points[index], point), 0), [points]);
  const elevationGain = useMemo(() => points.slice(1).reduce((total, point, index) => total + Math.max(0, point.altitude - points[index].altitude), 0), [points]);
  const elevationLoss = useMemo(() => points.slice(1).reduce((total, point, index) => total + Math.max(0, points[index].altitude - point.altitude), 0), [points]);
  const currentPace = points.length > 1 ? pace(Math.max(1, (points.at(-1)!.timestamp - points.at(-2)!.timestamp) / 1000), metresBetween(points.at(-2)!, points.at(-1)!)) : "—";
  const currentSplit = Math.floor(distanceMetres / 1000) + 1;

  const beginWatching = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return Alert.alert("Location needed", "Enable location access so VELTURA can measure distance and draw your route.");
    watcher.current?.remove();
    watcher.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 }, (position) => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, altitude: position.coords.altitude ?? 0, timestamp: position.timestamp };
      setPoints((current) => current.length && metresBetween(current.at(-1)!, next) < 2 ? current : [...current, next]);
      map.current?.animateCamera({ center: next }, { duration: 350 });
    });
    setState("running");
  };

  const pause = () => { watcher.current?.remove(); watcher.current = null; setState("paused"); };
  const finish = async () => {
    watcher.current?.remove(); watcher.current = null; setState("finished");
    const key = `pulsecoach.runs.${userKey}`;
    const previous = JSON.parse(await AsyncStorage.getItem(key) ?? "[]");
    await AsyncStorage.setItem(key, JSON.stringify([...previous, { id: String(Date.now()), completedAt: new Date().toISOString(), seconds, distanceMetres, elevationGain, elevationLoss, heartRate, points }]));
  };

  const region = points.length ? { latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 } : { latitude: -29.7387, longitude: 151.7385, latitudeDelta: 0.04, longitudeDelta: 0.04 };

  return <ScreenContainer className="px-5 pt-4">
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Workout</Text></Pressable>
      <View><Text style={styles.eyebrow}>OUTDOOR RUN</Text><Text style={styles.title}>{state === "finished" ? "Run complete" : state === "ready" ? "Ready to run?" : state === "paused" ? "Run paused" : "Run in progress"}</Text><Text style={styles.subtitle}>{locationMessage}</Text></View>

      <View style={styles.mapCard}>
        <MapView ref={map} style={styles.map} initialRegion={region} showsUserLocation followsUserLocation={state === "running"}>
          {points.length > 1 ? <Polyline coordinates={points} strokeColor={mint} strokeWidth={5} /> : null}
          {points.length ? <Marker coordinate={points[0]} title="Start" pinColor={mint} /> : null}
        </MapView>
      </View>

      <View style={styles.primaryStats}><Stat label="DISTANCE" value={(distanceMetres / 1000).toFixed(2)} unit="km" large /><Stat label="TIME" value={clock(seconds)} large /></View>
      <View style={styles.stats}><Stat label="CURRENT PACE" value={currentPace} unit="/km" /><Stat label="AVERAGE PACE" value={pace(seconds, distanceMetres)} unit="/km" /><Stat label="CURRENT SPLIT" value={`${currentSplit}`} unit="km" /><Stat label="HEART RATE" value={heartRate ? String(Math.round(heartRate)) : "—"} unit="bpm" /><Stat label="ELEVATION GAIN" value={String(Math.round(elevationGain))} unit="m" /><Stat label="ELEVATION LOSS" value={String(Math.round(elevationLoss))} unit="m" /></View>

      {state === "ready" ? <Pressable style={styles.start} onPress={() => void beginWatching()}><Text style={styles.startText}>Start run</Text></Pressable> : null}
      {state === "running" ? <View style={styles.actions}><Pressable style={styles.secondary} onPress={pause}><Text style={styles.secondaryText}>Pause</Text></Pressable><Pressable style={styles.finish} onPress={() => void finish()}><Text style={styles.finishText}>Finish</Text></Pressable></View> : null}
      {state === "paused" ? <View style={styles.actions}><Pressable style={styles.startSmall} onPress={() => void beginWatching()}><Text style={styles.startText}>Resume</Text></Pressable><Pressable style={styles.finish} onPress={() => void finish()}><Text style={styles.finishText}>Finish</Text></Pressable></View> : null}
      {state === "finished" ? <Text style={styles.saved}>Run saved to your VELTURA history.</Text> : null}
      <Text style={styles.note}>GPS pace can move around in poor reception. Heart rate is shown when Apple Health has a recent value available.</Text>
    </ScrollView>
  </ScreenContainer>;
}

function Stat({ label, value, unit, large = false }: { label: string; value: string; unit?: string; large?: boolean }) {
  return <View style={[styles.stat, large && styles.statLarge]}><Text style={styles.statLabel}>{label}</Text><View style={styles.valueRow}><Text style={[styles.statValue, large && styles.statValueLarge]}>{value}</Text>{unit ? <Text style={styles.unit}>{unit}</Text> : null}</View></View>;
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 34 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" }, subtitle: { color: muted, fontSize: 13, marginTop: 4 }, mapCard: { height: 280, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#344337", backgroundColor: "rgba(66, 132, 174, 0.38)" }, map: { flex: 1 }, primaryStats: { flexDirection: "row", gap: 10 }, stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, stat: { width: "48%", minHeight: 86, borderRadius: 16, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)", padding: 13 }, statLarge: { flex: 1, width: undefined, minHeight: 104 }, statLabel: { color: muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 8 }, statValue: { color: "#F4F7F0", fontSize: 23, fontWeight: "900" }, statValueLarge: { fontSize: 29 }, unit: { color: mint, fontSize: 11, fontWeight: "800" }, start: { backgroundColor: mint, borderRadius: 18, padding: 18, alignItems: "center" }, startSmall: { flex: 1, backgroundColor: mint, borderRadius: 17, padding: 17, alignItems: "center" }, startText: { color: "#111513", fontSize: 16, fontWeight: "900" }, actions: { flexDirection: "row", gap: 10 }, secondary: { flex: 1, backgroundColor: "rgba(54, 119, 161, 0.46)", borderRadius: 17, padding: 17, alignItems: "center" }, secondaryText: { color: mint, fontWeight: "900" }, finish: { flex: 1, backgroundColor: "#542B2B", borderRadius: 17, padding: 17, alignItems: "center" }, finishText: { color: "#FFB4AB", fontWeight: "900" }, saved: { color: mint, textAlign: "center", fontWeight: "800" }, note: { color: "#718071", fontSize: 10, lineHeight: 15 }
});
