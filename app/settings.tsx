import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../hooks/use-auth";
import { loadProfilePreferences } from "../lib/profile-preferences";
import { SETTINGS_SECTIONS } from "../lib/settings-screen-config";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!user?.openId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try { await loadProfilePreferences(user.openId); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load settings."); }
    finally { setLoading(false); }
  }, [user?.openId]);
  useFocusEffect(useCallback(() => { void reloadKey; void load(); }, [load, reloadKey]));

  if (authLoading || loading) return <View style={styles.center}><ActivityIndicator size="large" color="#5eead4" /><Text style={styles.muted}>Loading settings…</Text></View>;
  if (!user) return <View style={styles.center}><Text style={styles.title}>Sign in to view settings</Text><Pressable style={styles.button} onPress={() => router.push("/login")}><Text style={styles.buttonText}>Sign in</Text></Pressable></View>;
  if (error) return <View style={styles.center}><Text style={styles.title}>Settings unavailable</Text><Text style={styles.muted}>{error}</Text><View style={styles.actions}><Pressable style={styles.button} onPress={() => setReloadKey((v) => v + 1)}><Text style={styles.buttonText}>Retry</Text></Pressable><Pressable style={styles.secondary} onPress={() => router.back()}><Text style={styles.buttonText}>Back</Text></Pressable></View></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Settings</Text><Text style={styles.muted}>Manage your PulseCoach experience</Text>
    <View style={styles.card}>{SETTINGS_SECTIONS.map((section) => <Pressable key={section.id} accessibilityRole="button" style={styles.row} onPress={() => router.push(("/settings/" + section.id) as any)}><View><Text style={styles.rowTitle}>{section.title}</Text><Text style={styles.muted}>{section.description}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}</View>
  </ScrollView>;
}

const styles = StyleSheet.create({ container:{flex:1,backgroundColor:"#07111f"}, content:{padding:20,paddingBottom:40}, center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,backgroundColor:"#07111f"}, heading:{fontSize:30,fontWeight:"800",color:"#fff"}, title:{fontSize:20,fontWeight:"700",color:"#fff",textAlign:"center",marginBottom:8}, muted:{color:"#9fb0c5",marginTop:4}, card:{backgroundColor:"#102033",borderRadius:16,marginTop:20,overflow:"hidden"}, row:{minHeight:72,padding:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"#294057",flexDirection:"row",alignItems:"center",justifyContent:"space-between"}, rowTitle:{fontSize:16,fontWeight:"700",color:"#fff"}, chevron:{fontSize:30,color:"#5eead4"}, button:{backgroundColor:"#14b8a6",borderRadius:10,paddingHorizontal:20,paddingVertical:12,marginTop:20}, secondary:{backgroundColor:"#294057",borderRadius:10,paddingHorizontal:20,paddingVertical:12,marginTop:20}, buttonText:{color:"#fff",fontWeight:"700"}, actions:{flexDirection:"row",gap:12}
});
