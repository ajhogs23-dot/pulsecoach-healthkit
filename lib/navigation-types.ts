import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type ProfileStackParamList = {
  profile: undefined;
  "personal-details": undefined;
  health: undefined;
  "health-diagnostics": undefined;
};

export type MainTabParamList = {
  index: undefined;
  coach: undefined;
  nutrition: undefined;
  workout: { focus?: string; duration?: string; readiness?: string; limitation?: string; equipment?: string; fresh?: string } | undefined;
  supplements: undefined;
  progress: undefined;
};

// Other feature routes remain registered by Expo Router at the root level.
export type RootNavigatorParamList = {
  "(tabs)": NavigatorScreenParams<MainTabParamList> | undefined;
  "(profile)": NavigatorScreenParams<ProfileStackParamList> | undefined;
  login: undefined;
  "oauth/callback": { code?: string; state?: string } | undefined;
};
export type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;
