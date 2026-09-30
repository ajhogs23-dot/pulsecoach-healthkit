export function isIntentionalDeepLink(initialUrl?: string | null) {
  if (!initialUrl) return false;
  try {
    const parsed = new URL(initialUrl);
    const path = parsed.pathname.replace(/\/+$/, "");
    return path !== "" && path !== "/index" && path !== "/(tabs)";
  } catch {
    return false;
  }
}

export function shouldResetColdLaunch(initialUrl?: string | null) {
  return !isIntentionalDeepLink(initialUrl);
}

export function shouldIssueHomeRedirect(input: { startupMode: "pending" | "home" | "deep-link"; isAuthenticated: boolean; isAuthRoute: boolean; atHome: boolean; alreadyIssued: boolean }) {
  return input.startupMode === "home" && input.isAuthenticated && !input.isAuthRoute && !input.atHome && !input.alreadyIssued;
}
