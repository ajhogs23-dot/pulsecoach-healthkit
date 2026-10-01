import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { getApiBaseUrl, getRedirectUri } from "@/constants/oauth";
import * as Auth from "./auth";

const KEY = "veltura_login_verifier";
let pendingExchange: Promise<void> | null = null;
let completedCode: string | null = null;

async function saveVerifier(verifier: string) {
  if (Platform.OS === "web") window.sessionStorage.setItem(KEY, verifier);
  else await SecureStore.setItemAsync(KEY, verifier);
}
async function loadVerifier() {
  return Platform.OS === "web" ? window.sessionStorage.getItem(KEY) : SecureStore.getItemAsync(KEY);
}
async function clearVerifier() {
  if (Platform.OS === "web") window.sessionStorage.removeItem(KEY);
  else await SecureStore.deleteItemAsync(KEY);
}

export async function beginGitHubLogin(): Promise<void> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  const challenge = digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const response = await fetch(`${getApiBaseUrl()}/api/oauth/prepare`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, returnUrl: getRedirectUri() }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.url !== "string") throw new Error(result.error || "Could not start GitHub sign-in");
  await saveVerifier(verifier);
  completedCode = null;
  if (Platform.OS === "web") window.location.assign(result.url);
  else await Linking.openURL(result.url);
}

export function completeGitHubLogin(loginCode: string): Promise<void> {
  // React may run the callback effect twice. Consume each one-time code once.
  if (completedCode === loginCode) return Promise.resolve();
  if (pendingExchange) return pendingExchange;
  pendingExchange = (async () => {
    const verifier = await loadVerifier();
    if (!verifier) throw new Error("Sign-in was not started on this device. Please start again.");
    const response = await fetch(`${getApiBaseUrl()}/api/oauth/exchange`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginCode, verifier }),
    });
    const result = await response.json();
    if (!response.ok || !result.app_session_id || !result.user) throw new Error(result.error || "Sign-in failed");
    await Auth.setSessionToken(result.app_session_id);
    await Auth.setUserInfo({ ...result.user, lastSignedIn: new Date(result.user.lastSignedIn) });
    await clearVerifier();
    completedCode = loginCode;
    Auth.notifyAuthChanged();
  })().finally(() => { pendingExchange = null; });
  return pendingExchange;
}
