import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { MANAGED_PUBLIC_DEFAULTS } from "./public-config";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || MANAGED_PUBLIC_DEFAULTS.apiBaseUrl;
// Retained public exports for existing profile ownership checks.
export const APP_ID = process.env.EXPO_PUBLIC_APP_ID || MANAGED_PUBLIC_DEFAULTS.appId;
export const OWNER_OPEN_ID = process.env.EXPO_PUBLIC_OWNER_OPEN_ID || MANAGED_PUBLIC_DEFAULTS.ownerId;
export const OWNER_NAME = process.env.EXPO_PUBLIC_OWNER_NAME || MANAGED_PUBLIC_DEFAULTS.ownerName;
export const OAUTH_PORTAL_URL = "";
export const OAUTH_SERVER_URL = "";
export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

export function getApiBaseUrl(): string { return API_BASE_URL.replace(/\/$/, ""); }
export const getRedirectUri = () => Platform.OS === "web"
  ? `${window.location.origin}/oauth/callback`
  : Linking.createURL("/oauth/callback", { scheme: "manuspulsecoach" });

export async function startOAuthLogin(): Promise<string | null> {
  const { beginGitHubLogin } = await import("../lib/_core/github-login");
  await beginGitHubLogin();
  return null;
}
