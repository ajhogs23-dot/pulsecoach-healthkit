import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { ExerciseLibraryItem } from "@/lib/exercise-library";

type Props = { exercise: ExerciseLibraryItem; height?: number };

const exerciseArtwork: Partial<Record<ExerciseLibraryItem["id"], number>> = {
  "chest-push-up": require("@/assets/exercises/chest/push-up.png"),
  "chest-wide-push-up": require("@/assets/exercises/chest/wide-push-up.png"),
  "chest-incline-push-up": require("@/assets/exercises/chest/incline-push-up.png"),
  "chest-decline-push-up": require("@/assets/exercises/chest/decline-push-up.png"),
  "chest-db-floor": require("@/assets/exercises/chest/dumbbell-floor-press.png"),
  "chest-db-bench": require("@/assets/exercises/chest/dumbbell-bench-press.png"),
  "chest-db-incline": require("@/assets/exercises/chest/incline-dumbbell-press.png"),
  "chest-db-fly": require("@/assets/exercises/chest/dumbbell-fly.png"),
  "chest-bench": require("@/assets/exercises/chest/barbell-bench-press.png"),
  "chest-incline-bench": require("@/assets/exercises/chest/incline-barbell-bench-press.png"),
  "chest-machine": require("@/assets/exercises/chest/machine-chest-press.png"),
  "chest-cable-fly": require("@/assets/exercises/chest/cable-fly.png"),
  "chest-pec-deck": require("@/assets/exercises/chest/pec-deck.png"),
  "back-superman": require("@/assets/exercises/back/superman-hold.png"),
  "back-prone-y": require("@/assets/exercises/back/prone-y-raise.png"),
  "back-db-row": require("@/assets/exercises/back/single-arm-dumbbell-row.png"),
  "back-db-pullover": require("@/assets/exercises/back/dumbbell-pullover.png"),
  "back-renegade": require("@/assets/exercises/back/renegade-row.png"),
  "back-pulldown": require("@/assets/exercises/back/lat-pulldown.png"),
  "back-seated-row": require("@/assets/exercises/back/seated-cable-row.png"),
  "back-assisted-pullup": require("@/assets/exercises/back/assisted-pull-up.png"),
  "back-pullup": require("@/assets/exercises/back/pull-up.png"),
  "back-tbar": require("@/assets/exercises/back/t-bar-row.png"),
  "back-barbell-row": require("@/assets/exercises/back/barbell-bent-over-row.png"),
  "back-machine-row": require("@/assets/exercises/back/machine-row.png"),
};

function movementFor(name: string) {
  if (/squat|lunge|step-up|leg press|hack/i.test(name)) return "squat";
  if (/plank|push-up|mountain|bird dog|dead bug|crunch|superman/i.test(name)) return "floor";
  if (/row|pull|curl|fly|raise/i.test(name)) return "pull";
  if (/run|walk|bike|rower|cardio|boxing|rope|burpee|sled|interval/i.test(name)) return "cardio";
  return "press";
}

function Person({ x, pose, accent }: { x: number; pose: string; accent: string }) {
  const floor = pose === "floor";
  if (floor) return <G x={x} y="51"><Circle cx="68" cy="47" r="8" fill="url(#skin)" /><Path d="M24 63 Q48 48 69 55 L97 69" fill="none" stroke="url(#body)" strokeWidth="17" strokeLinecap="round" /><Path d="M42 58 L25 85 M57 61 L53 88 M82 62 L105 84" fill="none" stroke="url(#limb)" strokeWidth="10" strokeLinecap="round" /><Path d="M42 54 L60 60" stroke={accent} strokeWidth="9" strokeLinecap="round" opacity=".95" /></G>;
  const squat = pose === "squat";
  const cardio = pose === "cardio";
  return <G x={x} y="23">
    <Circle cx="55" cy="22" r="9" fill="url(#skin)" />
    <Path d={squat ? "M54 34 Q49 55 60 75" : cardio ? "M54 34 Q60 54 55 77" : "M54 34 L54 78"} fill="none" stroke="url(#body)" strokeWidth="18" strokeLinecap="round" />
    <Path d={squat ? "M50 70 L31 91 L53 105 M61 72 L79 90 L70 108" : cardio ? "M53 73 L35 94 L25 111 M57 74 L75 92 L88 103" : "M49 75 L41 108 M59 75 L68 108"} fill="none" stroke="url(#limb)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <Path d={pose === "press" ? "M48 45 L27 30 M61 45 L82 30" : pose === "pull" ? "M47 46 L25 56 M61 46 L83 56" : cardio ? "M48 46 L30 63 M61 48 L78 34" : "M47 47 L31 67 M61 47 L77 66"} fill="none" stroke="url(#limb)" strokeWidth="9" strokeLinecap="round" />
    <Ellipse cx="54" cy="47" rx="13" ry="9" fill={accent} opacity=".92" />
  </G>;
}

export function ExerciseVisual({ exercise, height = 145 }: Props) {
  const artwork = exerciseArtwork[exercise.id];
  if (artwork) {
    return <View style={[styles.artworkFrame, { height }]}><Image source={artwork} resizeMode="cover" style={styles.artwork} accessibilityLabel={`${exercise.name} start and finish positions`} /></View>;
  }
  const pose = movementFor(exercise.name);
  const accent = exercise.muscleGroup === "Cardio" ? "#FF8B69" : "#FF624D";
  return <Svg width="100%" height={height} viewBox="0 0 260 150" accessibilityLabel={`${exercise.name} movement illustration`}>
    <Defs>
      <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F7FDFF" /><Stop offset=".48" stopColor="#CFE9F8" /><Stop offset="1" stopColor="#9FC9E2" /></LinearGradient>
      <LinearGradient id="body" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FBFEFF" /><Stop offset=".5" stopColor="#B8CED9" /><Stop offset="1" stopColor="#718B9A" /></LinearGradient>
      <LinearGradient id="limb" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#EAF5F8" /><Stop offset="1" stopColor="#7793A2" /></LinearGradient>
      <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#C68D6C" /><Stop offset="1" stopColor="#774936" /></LinearGradient>
    </Defs>
    <Rect x="2" y="2" width="256" height="146" rx="22" fill="url(#glass)" stroke="#FFFFFF" strokeWidth="3" />
    <Path d="M18 118 Q72 91 126 116 T242 111" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity=".48" />
    <Path d="M24 26 L80 26 M180 26 L236 26" stroke="#FFFFFF" strokeWidth="2" opacity=".55" />
    <Person x={8} pose={pose} accent={accent} /><Person x={132} pose={pose} accent={accent} />
    <Circle cx="130" cy="76" r="14" fill="#FFFFFF" opacity=".76" /><Path d="M125 70 L136 76 L125 82Z" fill="#4C7B96" />
    <Rect x="15" y="124" width="230" height="12" rx="6" fill="#87B4CE" opacity=".38" />
  </Svg>;
}

const styles = StyleSheet.create({
  artworkFrame: { width: "100%", overflow: "hidden", backgroundColor: "#CDEBFA" },
  artwork: { width: "100%", height: "100%" },
});
