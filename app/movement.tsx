import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";

import { ScreenContainer } from "@/components/screen-container";
import { TabBackground } from "@/components/tab-background";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { loadHealthSnapshot, syncHealthData, type HealthSyncSnapshot } from "@/lib/healthkit";

const mint = "#B8F36B";
const muted = "#A8B3A6";
const glenInnes = { latitude: -29.738, longitude: 151.738, latitudeDelta: 0.045, longitudeDelta: 0.045 };
type MovementPoint = LatLng & { timestamp: number };
const userKeyFor = (user: { openId?: string; id?: number } | null) => user?.openId ?? (user?.id ? String(user.id) : "local-user");
const day = () => new Date().toISOString().slice(0, 10);
const routeKey = (userKey: string) => `veltura.daily-movement-route.${userKey}.${day()}`;

const metresBetween = (a: LatLng, b: LatLng) => {
  const rad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * rad * Math.cos((a.latitude + b.latitude) * rad / 2);
  const y = (b.latitude - a.latitude) * rad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
};

export default function MovementScreen() {
  const { user } = useAuth({ autoFetch: false });
  const userKey = userKeyFor(user);
  const [health, setHealth] = useState<HealthSyncSnapshot | null>(null);
  const [points, setPoints] = useState<MovementPoint[]>([]);
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("Your daily movement is separate from recorded workouts.");
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const map = useRef<MapView | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadHealthSnapshot(userKey), AsyncStorage.getItem(routeKey(userKey))]).then(async ([snapshot, savedRoute]) => {
      if (!active) return;
      setHealth(snapshot);
      if (savedRoute) { try { setPoints(JSON.parse(savedRoute)); } catch {} }
      if (snapshot.status === "connected" || snapshot.lastSyncedAt) {
        const synced = await syncHealthData(userKey, new Date(), snapshot.preferences);
        if (active) setHealth(synced);
      }
    });
    return () => { active = false; watcher.current?.remove(); watcher.current = null; };
  }, [userKey]));

  const savePoints = (next: MovementPoint[]) => {
    setPoints(next);
    void AsyncStorage.setItem(routeKey(userKey), JSON.stringify(next));
  };

  const startTracking = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setMessage("Location permission is needed to draw the daily movement map.");
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const first = { latitude: current.coords.latitude, longitude: current.coords.longitude, timestamp: current.timestamp };
    const initial = points.length ? points : [first];
    savePoints(initial);
    setTracking(true);
    setMessage("Daily movement mapping is active. Workout trackers remain separate.");
    map.current?.animateToRegion({ ...first, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 450);
    watcher.current?.remove();
    watcher.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 8_000, distanceInterval: 12 }, (position) => {
      const nextPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude, timestamp: position.timestamp };
      setPoints((currentPoints) => {
        if (currentPoints.length && metresBetween(currentPoints.at(-1)!, nextPoint) < 8) return currentPoints;
        const next = [...currentPoints, nextPoint];
        void AsyncStorage.setItem(routeKey(userKey), JSON.stringify(next));
        return next;
      });
      map.current?.animateCamera({ center: nextPoint }, { duration: 400 });
    });
  };

  const stopTracking = () => {
    watcher.current?.remove(); watcher.current = null; setTracking(false);
    setMessage("Daily movement map saved for today.");
  };

  const clearRoute = () => {
    stopTracking(); savePoints([]); setMessage("Today’s movement route was cleared. Steps and calories from Apple Health were not changed.");
  };

  const summary = health?.summary;
  const distance = points.slice(1).reduce((total, point, index) => total + metresBetween(points[index], point), 0);
  const centre = points[0] ? { ...points[0], latitudeDelta: 0.025, longitudeDelta: 0.025 } : glenInnes;

  return <ScreenContainer className="px-5 pt-4">
    <TabBackground source={require("@/assets/images/tab-backgrounds/today.png")} opacity={0.3} />
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Today</Text></Pressable>
      <View><Text style={styles.eyebrow}>DAILY MOVEMENT</Text><Text style={styles.title}>Your day on the move.</Text><Text style={styles.subtitle}>Daily steps, active calories and an optional route map. Run, walk and cycle sessions keep their own separate statistics.</Text></View>
      <View style={styles.stats}><Stat label="Steps" value={summary?.steps === undefined ? "—" : Math.round(summary.steps).toLocaleString("en-AU")} note="Daily total" /><Stat label="Active energy" value={summary?.activeEnergyKcal === undefined ? "—" : `${Math.round(summary.activeEnergyKcal)} kcal`} note="Apple Health" /><Stat label="Mapped" value={`${(distance / 1000).toFixed(2)} km`} note="Daily route only" /></View>
      <View style={styles.mapCard}><MapView ref={map} style={styles.map} initialRegion={centre} showsUserLocation>{points.length > 1 ? <Polyline coordinates={points} strokeColor={mint} strokeWidth={5} /> : null}{points[0] ? <Marker coordinate={points[0]} title="Movement map started" pinColor={mint} /> : null}</MapView><View style={styles.mapBadge}><Text style={styles.mapBadgeText}>{tracking ? "● MAPPING NOW" : points.length ? "TODAY’S SAVED ROUTE" : "MAP READY"}</Text></View></View>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={[styles.primary, tracking && styles.stop]} onPress={() => tracking ? stopTracking() : void startTracking()}><IconSymbol name={tracking ? "stop.fill" : "location.fill"} size={18} color="#111513" /><Text style={styles.primaryText}>{tracking ? "Stop and save movement map" : points.length ? "Continue today’s map" : "Start today’s movement map"}</Text></Pressable>
      {points.length ? <Pressable style={styles.clear} onPress={clearRoute}><Text style={styles.clearText}>Clear today’s route map</Text></Pressable> : null}
      <View style={styles.info}><Text style={styles.infoTitle}>Kept separate by design</Text><Text style={styles.infoCopy}>This screen never saves a Run, Walk, Cycle, Gym, or indoor-cardio workout. Those trackers count only while their own activity is active. Daily Health steps can still include every step recorded by your phone or watch.</Text></View>
      <Text style={styles.note}>Mapping runs while this screen is active. Continuous locked-phone mapping will need a later native background-location update and a new iOS build.</Text>
    </ScrollView>
  </ScreenContainer>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statNote}>{note}</Text></View>; }

const styles = StyleSheet.create({
  content: { gap: 15, paddingBottom: 34 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900", marginTop: 5 }, subtitle: { color: muted, fontSize: 13, lineHeight: 19, marginTop: 6 }, stats: { flexDirection: "row", gap: 7 }, stat: { flex: 1, minHeight: 94, borderRadius: 15, padding: 11, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" }, statLabel: { color: muted, fontSize: 9, fontWeight: "800" }, statValue: { color: "#F4F7F0", fontSize: 17, fontWeight: "900", marginTop: 8 }, statNote: { color: mint, fontSize: 9, marginTop: 4 }, mapCard: { height: 330, borderRadius: 21, overflow: "hidden", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.60)" }, map: { flex: 1 }, mapBadge: { position: "absolute", top: 12, left: 12, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "rgba(8, 35, 55, 0.78)" }, mapBadgeText: { color: mint, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 }, message: { color: "#E7F1F6", fontSize: 12, lineHeight: 17 }, primary: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 15, borderRadius: 15, backgroundColor: mint }, stop: { backgroundColor: "#F7CF77" }, primaryText: { color: "#111513", fontWeight: "900" }, clear: { alignItems: "center", padding: 11 }, clearText: { color: "#F49AB5", fontSize: 12, fontWeight: "800" }, info: { borderRadius: 17, padding: 15, backgroundColor: "rgba(66, 132, 174, 0.38)", borderWidth: 1, borderColor: "rgba(174, 224, 255, 0.46)" }, infoTitle: { color: "#F4F7F0", fontWeight: "900" }, infoCopy: { color: muted, fontSize: 11, lineHeight: 17, marginTop: 6 }, note: { color: "#879995", fontSize: 10.5, lineHeight: 16 },
});
