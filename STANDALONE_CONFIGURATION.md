# PulseCoach standalone configuration

## Safe public client values

The exported PulseCoach client now includes safe public defaults copied from the managed project, so it can construct the OAuth URL even when a local environment file is absent.

| Variable | Value | Purpose |
|---|---|---|
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | `https://manus.im` | Starts the Manus OAuth sign-in flow. |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | `https://api.manus.im` | Public OAuth service base URL used by the managed backend. |
| `EXPO_PUBLIC_APP_ID` | `CkXq3pRLPFCvmuDvGFNRXZ` | Public application identifier used in OAuth requests. |
| `EXPO_PUBLIC_OWNER_OPEN_ID` | `HWKtAfSvxLG3ZCdMNvQvbL` | Public owner identifier used by the existing admin configuration. |
| `EXPO_PUBLIC_OWNER_NAME` | `Andrew Hoggan` | Owner display name used by the existing admin configuration. |
| `EXPO_PUBLIC_API_BASE_URL` | `https://pulsecoach-ckxq3prl.manus.space` | Permanent published PulseCoach API host. |

These values are client configuration and are bundled into the app. They are not replacements for private server configuration. Never put `DATABASE_URL`, `JWT_SECRET`, provider client secrets, signing certificates, or other private credentials in this file or the Expo bundle.

## Reachability and stability

The API host responded over public HTTPS during validation when the managed server was running. An unauthenticated request to `/api/auth/me` returned `401`, which is the expected protected-endpoint response and demonstrates that the proxy was reachable. The OAuth portal also responded over public HTTPS.

The published host is served from the project’s persistent published domain and is not the task-scoped `manus.computer` preview host. A live unauthenticated probe returned `401` over HTTPS, which confirms that the protected endpoint is reachable. Future availability is subject to the published hosting service and account status; it is not dependent on the temporary development sandbox.

## Authentication portability

The current Manus OAuth flow is not client-only. It requires the published backend to remain online, with private server-side OAuth and session-signing configuration. The client defaults fix the invalid `/app-auth` URL, and the published backend is now addressed through the persistent project domain.

For the current published deployment, `EXPO_PUBLIC_API_BASE_URL` is set to the permanent published host. Keep server-side secrets in the managed deployment and register the native redirect scheme and application identifier with the selected identity provider before App Store release. Do not replace the auth system with a fake local login for production because that would not securely support the app’s user-specific backend data.
