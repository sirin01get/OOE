# Auth Setup: Google, Apple, X/Twitter, and Email

OOE offers Google, Apple, X/Twitter, and email magic-link sign-in. Email
magic-link works out of the box once Email is enabled in Supabase. Each
OAuth provider needs one-time setup in the provider's developer console
and in the Supabase dashboard. There is no Cloudflare Function involved;
`supabase-js` handles the OAuth redirect in the browser, and Supabase
Auth acts as the backend that completes the token exchange.

## How it works (architecture)

1. User clicks "Continue with Google/Apple/X" → `supabase.auth.signInWithOAuth({ provider })`
2. Browser redirects to the selected provider's login screen
3. User approves → redirected back to your app's URL (the `redirectTo` you configured) with an auth code in the URL
4. `supabase-js` automatically exchanges that code for a session and fires `onAuthStateChange` — `App.jsx` already listens for this and re-renders past `AuthGate` once a session exists. No new code was needed there.
5. The resulting Supabase user (`auth.users` row) is identical in shape regardless of provider — RLS policies (`auth.uid() = user_id`) work the same for Google/Apple/X/email users automatically.

## OTP/email session behavior

Email sign-in uses Supabase OTP/magic-link auth through
`supabase.auth.signInWithOtp`.

- When a user requests an email sign-in link, OOE stores that email in
  browser `localStorage` as `ooe:lastAuthEmail` so the next login screen
  can prefill and display the last-used email.
- After the user verifies the link, Supabase creates a browser session.
  On later visits, `App.jsx` calls `supabase.auth.getSession()` first; if
  the session is still valid, OOE skips `AuthGate` and opens the app
  directly.
- OOE never treats the remembered email alone as authentication. The app
  screen only opens when Supabase returns a valid session.
- While signed in, the top bar shows `session.user.email` next to
  "Sign out".
- On sign-out, OOE preserves the last authenticated email, clears the
  in-memory session immediately, and returns to `AuthGate` with the email
  OTP form ready. The user must verify email again or choose an enabled
  OAuth provider to continue.
- OOE applies defensive timeouts when loading the Supabase session and
  `/config.json`. If Supabase is slow, temporarily unreachable, or rate
  limited, the UI falls back to the login screen instead of staying on
  "Loading OOE..." forever.

## Initiator app tracking

OOE can optionally identify which app initiated authentication. The app
id comes from `/config.json`:

```json
{
  "app": {
    "id": "ooe"
  }
}
```

After Supabase creates a valid session, the frontend calls
`POST /api/auth/track` with the app id and the user's Supabase access
token. The Cloudflare Function validates the token, resolves the user
from Supabase, and inserts an `auth_events` row with:

- `user_id`
- `initiator_app_id`
- `provider`
- `email`
- `event_type`
- `created_at`

The app id is optional; if it is missing, the event is still tracked with
a null `initiator_app_id`. A remembered email is never used for tracking
identity; only the validated Supabase session is trusted.

## 1. Google OAuth setup

**In Google Cloud Console** (console.cloud.google.com):
1. Create a project (or use an existing one) → **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID** → Application type: **Web application**
3. Authorized redirect URI — get the exact value from Supabase first (see step below), it looks like:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
4. Save → copy the **Client ID** and **Client Secret**

**In Supabase dashboard:**
1. **Authentication → Providers → Google**
2. Toggle it on
3. Paste the Client ID and Client Secret from Google
4. Supabase shows you the exact **Callback URL** to paste back into Google Cloud Console (step 3 above) — copy it precisely
5. Save

## 2. Apple OAuth setup

Apple's setup is more involved since it requires an Apple Developer account ($99/year) and a "Sign in with Apple" Services ID.

**In Apple Developer portal** (developer.apple.com/account):
1. **Certificates, Identifiers & Profiles → Identifiers → +**
2. Register a new **Services ID** (this is your OAuth client ID — a string like `com.yourcompany.ooe.signin`)
3. Enable **Sign in with Apple** for that Services ID → Configure
4. Add your domain and the Supabase callback URL (same shape as Google's:
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)
5. Create a **Key** under Keys with "Sign in with Apple" enabled — download the `.p8` private key file (only downloadable once)
6. Note your **Team ID** (top right of the developer portal) and the **Key ID** of the key you just created

**In Supabase dashboard:**
1. **Authentication → Providers → Apple**
2. Toggle it on
3. Fill in: Services ID (client ID), Team ID, Key ID, and paste the contents of the `.p8` private key file
4. Save

## 3. X/Twitter OAuth setup

Supabase's current X/Twitter OAuth provider key in this app is `x`:
`supabase.auth.signInWithOAuth({ provider: 'x' })`.

**In the X Developer Portal** (developer.x.com):
1. Create or select a project and app.
2. Enable OAuth 2.0 / user authentication for the app.
3. Set the app type to Web App, Automated App, or Bot as appropriate.
4. Add the Supabase callback URL as an allowed callback/redirect URL:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
5. Add your production site URL as the website URL, for example:
   ```
   https://ooe.pages.dev
   ```
6. Save and copy the OAuth 2.0 **Client ID** and **Client Secret**.

**In Supabase dashboard:**
1. **Authentication → Providers → X / Twitter**
2. Toggle it on
3. Paste the Client ID and Client Secret from X
4. Confirm the callback URL shown by Supabase exactly matches the one
   entered in the X Developer Portal
5. Save

## 4. Redirect URLs (required for OAuth providers, plus email links)

**Authentication → URL Configuration** in Supabase:
- **Site URL:** your production URL, e.g. `https://privyooe-pages.pages.dev`
- **Redirect URLs:** add every URL the app can be opened from:
  ```
  http://localhost:5173/**
  https://privyooe-pages.pages.dev/**
  https://*.privyooe-pages.pages.dev/**   (Cloudflare preview deployments)
  ```
  Without this, Google/Apple/X/email-link redirects will fail or bounce
  to the wrong place after login.

## 5. Runtime auth config

The login UI only renders methods enabled in `public/config.json`.

```json
{
  "auth": {
    "google": true,
    "apple": true,
    "x": true,
    "email": true
  }
}
```

Set `"x": false` to hide "Continue with X" while keeping the provider
setup in Supabase for later.

## 6. Testing

- **Local:** `npm run dev`, click each button — Google and X should work once configured; Apple requires `localhost` to be added in both Apple's and Supabase's redirect config (Apple is stricter about this than Google).
- Confirm in Supabase **Authentication → Users** that a new user row appears after each provider's first successful login, with the correct provider shown in the "Providers" column.
- RLS is unaffected — no policy changes needed, since all auth methods produce the same `auth.users` row shape that `auth.uid()` resolves from.

## Troubleshooting loading or OTP issues

- If the page stays on "Loading OOE...", check the browser console for
  session/config timeout warnings.
- Check Supabase project status and Auth logs for throttling, rate
  limits, paused projects, or free-tier limits.
- OTP/email links can be delayed or rate limited on free-tier projects,
  especially after repeated sign-in attempts. Wait before retrying and
  check Supabase Authentication logs.
- If `/config.json` fails to load, OOE uses default auth-method settings
  so the login UI can still render.

## Notes

- You don't need separate handling per provider on the frontend beyond
  what's already in `AuthGate.jsx` — the provider key is passed to
  `signInWithOAuth`, and Supabase does the rest.
- Apple requires HTTPS for production (already satisfied by Cloudflare
  Pages) but does allow `http://localhost` for local development.
