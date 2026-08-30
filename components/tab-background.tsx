import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function TabBackground({ source, opacity = 0.2 }: { source: number; opacity?: number }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image source={source} contentFit="cover" transition={250} style={[StyleSheet.absoluteFill, { opacity }]} />
    <View style={[StyleSheet.absoluteFill, styles.shade]} />
  </View>;
}

const styles = StyleSheet.create({
  shade: { backgroundColor: "rgba(10, 14, 11, 0.44)" },
});
