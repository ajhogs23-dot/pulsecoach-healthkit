import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { startOAuthLogin } from "@/constants/oauth";
import { ScreenContainer } from "@/components/screen-container";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signIn() {
    setLoading(true); setError(null);
    try { await startOAuthLogin(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open sign-in"); }
    finally { setLoading(false); }
  }
  return <ScreenContainer className="px-6"><View style={styles.content}>
    <Text style={styles.eyebrow}>VELTURA</Text>
    <Text style={styles.title}>Your training, nutrition, and momentum in one place.</Text>
    <Text style={styles.copy}>Sign in with GitHub to keep your plans, progress, and settings connected. Your VELTURA account is created on your first sign-in.</Text>
    <Pressable disabled={loading} style={[styles.button, loading && { opacity: 0.6 }]} onPress={signIn}>
      <Text style={styles.buttonText}>{loading ? "Opening sign-in…" : "Continue with GitHub"}</Text>
    </Pressable>
    {error && <Text style={styles.error}>{error}</Text>}
    <Text style={styles.privacy}>You control your health permissions, sharing, and account deletion.</Text>
  </View></ScreenContainer>;
}
const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", gap: 20 },
  eyebrow: { color: "#B8F36B", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#F4F7F0", fontSize: 31, lineHeight: 37, fontWeight: "900" },
  copy: { color: "#A8B3A6", fontSize: 14, lineHeight: 21 },
  button: { backgroundColor: "#B8F36B", borderRadius: 15, padding: 17, alignItems: "center" },
  buttonText: { color: "#111513", fontSize: 15, fontWeight: "900" },
  error: { color: "#FCA5A5", fontSize: 14 },
  privacy: { color: "#A8B3A6", fontSize: 11, lineHeight: 16 },
});
