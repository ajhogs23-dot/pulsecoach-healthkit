# VELTURA GitHub login on Railway

Set these variables on the existing backend service. Keep credentials out of GitHub and client environment files.

- `GITHUB_CLIENT_ID`: the OAuth app's public client ID.
- `GITHUB_CLIENT_SECRET`: paste privately from GitHub directly into Railway.
- `PUBLIC_API_URL`: `https://pulsecoach-healthkit-production.up.railway.app`
- `OAUTH_RETURN_URLS`: `manuspulsecoach://oauth/callback` for the native app. For web testing, append the exact web callback URL, separated by a comma (for example `http://localhost:8081/oauth/callback`). No wildcards.
- Keep the existing `DATABASE_URL` and `JWT_SECRET`. The JWT secret must contain at least 32 characters.

GitHub's registered redirect URI must be `https://pulsecoach-healthkit-production.up.railway.app/api/oauth/callback`.

The browser uses a signed, short-lived state cookie and GitHub PKCE. The native/web callback receives a one-time handoff code, not a session token in the URL. The initiating app exchanges that code using its privately stored verifier. Handoffs expire after 60 seconds and are held in memory: keep one Railway replica. A restart during login requires starting sign-in again. Multiple replicas require shared handoff storage before scaling.

GitHub accounts use `github:<numeric GitHub ID>` as their stable identity. Do not automatically merge them with Manus accounts by email. The new Railway database does not contain the original Manus account data; migrating it requires a separate export and verified account linking.

Use `Continue with GitHub` in the updated app. Native development builds need rebuilding for the added Expo cryptography dependency. Existing installed builds still contain the old login code. Restart Metro after updating source and public environment values.

Verify login, cancellation, logout, and authenticated Profile/Settings loading on a device before declaring the migration complete. A logged-out `profile.personalDetails` response of 401 only confirms route presence, not authenticated success.
