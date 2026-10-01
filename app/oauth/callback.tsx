import { ThemedView } from "@/components/themed-view";
import { completeGitHubLogin } from "@/lib/_core/github-login";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const { loginCode, error } = useLocalSearchParams<{ loginCode?: string; error?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (error || !loginCode) {
      setMessage(error || "Sign-in is incomplete. Please start again.");
      return;
    }
    completeGitHubLogin(loginCode).then(() => {
      if (active) router.replace("/(tabs)");
    }).catch((reason) => {
      if (active) setMessage(reason instanceof Error ? reason.message : "Sign-in failed");
    });
    return () => { active = false; };
  }, [loginCode, error, router]);
  return <SafeAreaView className="flex-1"><ThemedView className="flex-1 items-center justify-center gap-4 p-5">
    {message ? <><Text className="text-foreground text-center">{message}</Text>
      <Pressable onPress={() => router.replace("/login")}><Text className="text-primary">Return to sign in</Text></Pressable></>
      : <><ActivityIndicator /><Text className="text-foreground">Completing GitHub sign-in…</Text></>}
  </ThemedView></SafeAreaView>;
}
