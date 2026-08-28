/**
 * Safe public values copied from the managed PulseCoach project.
 * These values are intentionally client-side configuration only.
 */
export const MANAGED_PUBLIC_DEFAULTS = {
  portal: "https://manus.im",
  server: "https://api.manus.im",
  appId: "CkXq3pRLPFCvmuDvGFNRXZ",
  ownerId: "HWKtAfSvxLG3ZCdMNvQvbL",
  ownerName: "Andrew Hoggan",
  apiBaseUrl: "https://pulsecoach-ckxq3prl.manus.space",
} as const;

export function buildOAuthLoginUrl(input: {
  portal: string;
  appId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(`${input.portal.replace(/\/$/, "")}/app-auth`);
  url.searchParams.set("appId", input.appId);
  url.searchParams.set("redirectUri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("type", "signIn");
  return url.toString();
}
