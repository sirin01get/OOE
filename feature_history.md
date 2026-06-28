# Feature History

## 2026-06-28 - Cloudflare Pages Deploy Command Fix

- Updated Wrangler to v4 for Cloudflare's current deployment flow.
- Added `npm run pages:upload` using `wrangler pages deploy`.
- Added Node 22 runtime guidance for Cloudflare Pages builds.
- Documented that Pages projects must not use `npx wrangler deploy`,
  which is the Workers deploy command.

## 2026-06-28 - Cloudflare Pages GitHub Deployment Support

- Added Cloudflare Pages SPA routing and static security/cache headers.
- Added `/api/health` to verify required encrypted server variables
  without exposing secret values.
- Added `npm run pages:deploy` for Wrangler-based Pages deployment.
- Documented Cloudflare manual setup, encrypted variables, health checks,
  and post-deploy verification.

## 2026-06-28 - Runtime Authentication Config

- Added `public/config.json` with auth toggles for Google, Apple, X, and email.
- Updated the login UI to read `/config.json` before rendering sign-in methods.
- Updated deployment instructions for configuring and verifying enabled auth methods.

## 2026-06-28 - X/Twitter Authentication

- Added "Continue with X" to the Supabase OAuth login UI using provider key `x`.
- Added X/Twitter setup steps to `AUTH_SETUP.md`.
- Added X/Twitter deployment/config notes to `DEPLOYMENT.md`.

## 2026-06-28 - OTP Email Remembering And Session Resume

- Persisted the last email used for OTP/magic-link sign-in in browser `localStorage`.
- Prefilled and displayed the last-used email on the login form.
- Displayed the signed-in Supabase email in the app top bar.
- Documented that returning users skip the email step only when Supabase restores a valid session.

## 2026-06-28 - Authentication Initiator App Tracking

- Added optional `app.id` to `public/config.json`.
- Added `auth_events` migration with `initiator_app_id` for tracking which app initiated sign-in.
- Added `/api/auth/track` to write auth events after validating the Supabase access token.
- Updated auth setup, deployment docs, and the `t_auth` template.

## 2026-06-28 - Sign-Out Returns To OTP Login

- Made sign-out explicitly clear the app session and return to the login screen.
- Preserved the last authenticated email so OTP verification can resume from the email form.
- Added a sign-out notice on `AuthGate`.
- Updated auth setup, deployment docs, and the `t_auth` template.

## 2026-06-28 - Loading Fallbacks For Auth

- Added timeouts around Supabase session loading and sign-out.
- Added a timeout and fallback defaults for `/config.json` loading.
- Documented Supabase throttling, free-tier limits, and Auth log checks for stuck loading or OTP issues.
- Updated deployment checks and the `t_auth` template.
