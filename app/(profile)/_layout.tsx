import { withLayoutContext } from "expo-router";
import type { StackNavigationState } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationEventMap,
  type NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "@/lib/navigation-types";

const NativeProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ProfileStack = withLayoutContext<
  NativeStackNavigationOptions,
  typeof NativeProfileStack.Navigator,
  StackNavigationState<ProfileStackParamList>,
  NativeStackNavigationEventMap
>(NativeProfileStack.Navigator);

// A deep link to a detail screen keeps Profile beneath it in the native stack.
export const unstable_settings = { initialRouteName: "profile" };

export default function ProfileNavigator() {
  return (
    <ProfileStack initialRouteName="profile" screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="profile" options={{ title: "Profile" }} />
      <ProfileStack.Screen name="personal-details" options={{ title: "Personal Details" }} />
      <ProfileStack.Screen name="health" options={{ title: "Apple Health" }} />
      <ProfileStack.Screen name="health-diagnostics" options={{ title: "Health Diagnostics" }} />
    </ProfileStack>
  );
}
