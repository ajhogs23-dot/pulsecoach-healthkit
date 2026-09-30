import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { loadProfilePreferences, type ProfilePreferences } from "@/lib/profile-preferences";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export default function ScheduleScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfilePreferences>();
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true; setProfile(undefined); setError("");
    if (user) void loadProfilePreferences(user.openId).then((value) => { if (active) setProfile(value); }).catch(() => { if (active) setError("Could not load your training preferences."); });
    return () => { active = false; };
  }, [user]));
  return <ScreenContainer className="px-5 pt-4"><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable>
    <Text style={styles.title}>Your training week</Text>
    <Text style={styles.copy}>{error || (profile ? `Goal: ${profile.goal}. Preferred duration: ${profile.workoutDuration ? `${profile.workoutDuration} minutes` : "Not set"}.` : user ? "Loading..." : "Sign in to see your training preferences.")}</Text>
    <Pressable style={styles.card} onPress={() => router.push("/personal-details")}><Text style={styles.link}>Edit training preferences in Personal Details</Text></Pressable>
    {days.map((day) => <View key={day} style={styles.card}><Text style={styles.heading}>{day}</Text><Text style={styles.copy}>{profile?.trainingDays?.toLowerCase().includes(day.toLowerCase()) ? "Preferred training day" : "No training preference set"}</Text></View>)}
  </ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { gap: 16, paddingBottom: 30 }, title: { color: "#F4F7F0", fontSize: 30, fontWeight: "800" }, heading: { color: "#F4F7F0", fontSize: 16, fontWeight: "700" }, copy: { color: "#A8B3A6", fontSize: 14, lineHeight: 20 }, link: { color: "#B8F36B", fontWeight: "700" }, card: { gap: 8, padding: 16, borderRadius: 18, backgroundColor: "rgba(76,143,184,0.40)", borderWidth: 1, borderColor: "rgba(174,224,255,0.54)" } });
