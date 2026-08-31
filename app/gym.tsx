import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TabBackground } from "@/components/tab-background";

const mint = "#B8F36B"; const muted = "#A8B3A6";
const cardio = [
  { title: "Treadmill", detail: "Run or walk · pace · incline", type: "Treadmill run" },
  { title: "Rowing machine", detail: "500 m split · strokes · watts", type: "Rowing machine" },
  { title: "Indoor bike", detail: "Cadence · resistance · power", type: "Indoor bike" },
  { title: "Stair climber", detail: "Floors · steps · vertical height", type: "Stair climber" },
] as const;

export default function GymScreen() {
  const openBuilder = (focus: string) => router.push({ pathname: "/workout", params: { focus, equipment: "Full gym", fresh: "1" } } as any);
  return <ScreenContainer className="px-5 pt-4"><TabBackground source={require("@/assets/images/tab-backgrounds/workout.png")} opacity={0.4} /><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Workout</Text></Pressable>
    <Text style={styles.eyebrow}>GYM</Text><Text style={styles.title}>Your complete gym.</Text><Text style={styles.subtitle}>Build a weights session, find an exercise, or record indoor equipment without needing GPS.</Text>
    <Text style={styles.section}>WEIGHTS & EXERCISES</Text>
    <View style={styles.grid}>
      <Tile title="Full gym workout" detail="Machines, cables, barbells and dumbbells" onPress={() => openBuilder("Full body")} />
      <Tile title="Free weights" detail="Dumbbells, barbells, kettlebells and EZ-bar" onPress={() => openBuilder("Full body")} />
      <Tile title="Machines" detail="Presses, rows, cables and lower-body machines" onPress={() => openBuilder("Full body")} />
      <Tile title="Bodyweight" detail="Push-ups, pull-ups, dips, core and more" onPress={() => router.push({ pathname: "/workout", params: { focus: "Full body", equipment: "Bodyweight", fresh: "1" } } as any)} />
    </View>
    <Pressable style={styles.scan} onPress={() => router.push("/machine" as any)}><IconSymbol name="camera.fill" size={21} color={mint} /><View style={styles.flex}><Text style={styles.scanTitle}>Identify a gym machine</Text><Text style={styles.scanCopy}>Use the camera for setup and muscle guidance.</Text></View><IconSymbol name="chevron.right" size={18} color={mint} /></Pressable>
    <Text style={styles.section}>INDOOR CARDIO</Text>
    <View style={styles.grid}>{cardio.map((item) => <Tile key={item.title} title={item.title} detail={item.detail} onPress={() => router.push({ pathname: "/indoor-cardio", params: { type: item.type } } as any)} />)}</View>
    <Text style={styles.note}>Compatible equipment and wearables can provide extra data. Manual entry is always available when a gym machine cannot sync.</Text>
  </ScrollView></ScreenContainer>;
}
function Tile({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) { return <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={onPress}><View style={styles.mark}><IconSymbol name="dumbbell.fill" size={20} color={mint} /></View><Text style={styles.tileTitle}>{title}</Text><Text style={styles.tileCopy}>{detail}</Text></Pressable>; }
const styles = StyleSheet.create({ content: { gap: 14, paddingBottom: 35 }, back: { color: mint, fontWeight: "800" }, eyebrow: { color: mint, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "900" }, subtitle: { color: "#D5E5EE", lineHeight: 20 }, section: { color: "#EAF6FC", fontSize: 11, fontWeight: "900", letterSpacing: 1.1, marginTop: 5 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, tile: { width: "48.5%", minHeight: 150, borderRadius: 18, padding: 14, backgroundColor: "rgba(42, 84, 116, 0.76)", borderWidth: 1, borderColor: "rgba(159, 218, 255, 0.65)" }, mark: { width: 39, height: 39, borderRadius: 13, backgroundColor: "rgba(15, 42, 65, 0.72)", alignItems: "center", justifyContent: "center" }, tileTitle: { color: "#F4F7F0", fontSize: 14, fontWeight: "900", marginTop: 13 }, tileCopy: { color: "#D5E5EE", fontSize: 10.5, lineHeight: 15, marginTop: 5 }, scan: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 16, padding: 14, backgroundColor: "rgba(39, 78, 108, 0.80)", borderWidth: 1, borderColor: "rgba(159, 218, 255, 0.62)" }, flex: { flex: 1 }, scanTitle: { color: "#F4F7F0", fontWeight: "900" }, scanCopy: { color: "#D5E5EE", fontSize: 11, marginTop: 3 }, note: { color: "#B9CDD8", fontSize: 11, lineHeight: 16, textAlign: "center" }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] } });
