import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { MuscleGroup } from "@/lib/exercise-library";

const green = "#B8F36B";
const active = "#7CFF38";
const body = "#334036";
const outline = "#738077";

type Props = { selected?: MuscleGroup; height?: number };

function colour(selected: MuscleGroup | undefined, group: MuscleGroup) {
  return selected === "Full body" || selected === group ? active : body;
}

function Figure({ x, back, selected }: { x: number; back?: boolean; selected?: MuscleGroup }) {
  return <G x={x}>
    <Circle cx="55" cy="24" r="15" fill="#202822" stroke={outline} strokeWidth="2" />
    <Path d="M42 42 Q55 37 68 42 L77 88 Q70 113 67 133 L43 133 Q40 113 33 88Z" fill="#202822" stroke={outline} strokeWidth="2" />
    <Path d="M34 49 Q18 58 14 91 L21 96 Q29 73 39 65Z" fill={colour(selected, "Shoulders")} stroke={outline} />
    <Path d="M76 49 Q92 58 96 91 L89 96 Q81 73 71 65Z" fill={colour(selected, "Shoulders")} stroke={outline} />
    <Path d="M16 92 L9 132 L18 135 L27 96Z" fill={colour(selected, "Arms")} stroke={outline} />
    <Path d="M94 92 L101 132 L92 135 L83 96Z" fill={colour(selected, "Arms")} stroke={outline} />
    {back ? <>
      <Path d="M39 51 Q55 44 71 51 L68 83 Q55 94 42 83Z" fill={colour(selected, "Back")} stroke={green} strokeOpacity=".35" />
      <Path d="M40 86 Q55 96 70 86 L67 124 L43 124Z" fill={colour(selected, "Core")} stroke={outline} />
    </> : <>
      <Path d="M39 50 Q47 44 54 49 L53 75 Q44 73 38 66Z" fill={colour(selected, "Chest")} stroke={green} strokeOpacity=".45" />
      <Path d="M56 49 Q63 44 71 50 L72 66 Q66 73 57 75Z" fill={colour(selected, "Chest")} stroke={green} strokeOpacity=".45" />
      <Rect x="45" y="77" width="20" height="45" rx="8" fill={colour(selected, "Core")} stroke={green} strokeOpacity=".35" />
    </>}
    <Path d="M43 132 L31 185 L45 188 L55 139Z" fill={colour(selected, "Legs")} stroke={outline} />
    <Path d="M67 132 L79 185 L65 188 L55 139Z" fill={colour(selected, "Legs")} stroke={outline} />
    <Path d="M31 185 L29 230 L42 230 L45 188Z" fill={colour(selected, "Legs")} stroke={outline} />
    <Path d="M79 185 L81 230 L68 230 L65 188Z" fill={colour(selected, "Legs")} stroke={outline} />
    {back ? <><Ellipse cx="47" cy="133" rx="10" ry="8" fill={colour(selected, "Legs")} /><Ellipse cx="63" cy="133" rx="10" ry="8" fill={colour(selected, "Legs")} /></> : null}
  </G>;
}

export function MuscleMap({ selected = "Full body", height = 250 }: Props) {
  return <Svg width="100%" height={height} viewBox="0 0 260 250" accessibilityLabel={`${selected} muscle map`}>
    <Path d="M8 18 H252 M8 232 H252" stroke="#263128" strokeWidth="1" />
    <Circle cx="130" cy="125" r="116" fill="#101512" stroke="#27342A" />
    <Figure x={12} selected={selected} />
    <Figure x={138} back selected={selected} />
  </Svg>;
}
