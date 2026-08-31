import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";

export default function TabLayout() {
  const colors = useColors();
  const { colorScheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#B8F36B", tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: 56 + bottomPadding, backgroundColor: colorScheme === "light" ? "rgba(232, 247, 255, 0.92)" : "rgba(6, 20, 32, 0.92)", borderTopColor: colorScheme === "light" ? "rgba(70, 125, 160, 0.35)" : "rgba(174, 224, 255, 0.28)", borderTopWidth: 0.5 } }}>
    <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} /> }} />
    <Tabs.Screen name="coach" options={{ title: "Coach", tabBarIcon: ({ color }) => <IconSymbol name="mic.fill" size={22} color={color} /> }} />
    <Tabs.Screen name="nutrition" options={{ title: "Nutrition", tabBarIcon: ({ color }) => <IconSymbol name="fork.knife" size={22} color={color} /> }} />
    <Tabs.Screen name="workout" options={{ title: "Workout", tabBarIcon: ({ color }) => <IconSymbol name="dumbbell.fill" size={22} color={color} /> }} />
          <Tabs.Screen
        name="supplements"
        options={{
          title: "Supps",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="pills.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress" options={{ title: "Progress", tabBarIcon: ({ color }) => <IconSymbol name="chart.bar.fill" size={22} color={color} /> }} />
  </Tabs>;
}
