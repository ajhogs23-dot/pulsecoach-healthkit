import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useThemeContext } from "@/lib/theme-provider";

export function TabBackground({ source, opacity = 0.34 }: { source: number; opacity?: number }) {
  const { colorScheme } = useThemeContext();
  const imageOpacity = colorScheme === "light" ? Math.min(0.72, opacity + 0.28) : opacity;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image source={source} contentFit="cover" transition={250} style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]} />
    <View style={[StyleSheet.absoluteFill, colorScheme === "light" ? styles.lightShade : styles.darkShade]} />
  </View>;
}

const styles = StyleSheet.create({
  lightShade: { backgroundColor: "rgba(6, 25, 39, 0.12)" },
  darkShade: { backgroundColor: "rgba(5, 14, 24, 0.38)" },
});
