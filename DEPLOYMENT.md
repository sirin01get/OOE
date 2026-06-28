# OOE Deployment Plan

## 1. Supabase

1. In your Supabase project's SQL editor, run `migrations/001_init.sql`.
2. Run `migrations/002_auth_events.sql` to create the `auth_events`
   table used for authentication initiator tracking.
3. Confirm RLS is enabled on `topics`, `research_runs`, `elements`,
   `decisions`, and `auth_events` (the migrations enable it, but verify
   in Table Editor → each table → RLS toggle).
4. Auth → Providers: confirm Email (magic link) is enabled. Enable any
   OAuth providers you plan to show in the UI: Google, Apple, and/or
   X/Twitter. Set the site URL and redirect URLs (Auth → URL
   Configuration) to your Cloudflare Pages domain, e.g.
   `https://ooe.pages.dev` and any custom domain.
5. Copy three values for later: Project URL, anon public key, service role
   key (Settings → API).

## 2. GitHub

1. Push this project to a new GitHub repository.
2. Keep `.env` out of the repo (already in `.gitignore`).

## 3. Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to
   Git → select `sirin01get/OOE`.
2. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Cloudflare reads `wrangler.toml` for the project name, compatibility
   date, and Pages build output directory. This repo also includes
   `public/_redirects` for SPA fallback routing and `public/_headers` for
   basic security/cache headers; Vite copies both into `dist`.
4. Environment variables (Settings → Environment variables), set for both
   Production and Preview. Cloudflare stores these values encrypted; do
   not commit them to Git:
   - `VITE_SUPABASE_URL` — client-safe, Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — client-safe, Supabase anon key
   - `SUPABASE_URL` — server-side, same project URL
   - `SUPABASE_ANON_KEY` — server-side, same anon key (used to build a
     user-scoped client in Functions)
   - `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never expose to client
   - `ANTHROPIC_API_KEY` — server-side only
5. Optional Wrangler CLI deployment after the variables exist in
   Cloudflare:

   ```bash
   npm run pages:deploy
   ```

   For local Pages Functions testing against a built `dist` folder:

   ```bash
   npm run build
   npm run pages:dev
   ```

6. Deploy. Cloudflare builds the static site and auto-detects
   `functions/api/*.js` as Pages Functions, deploying them alongside.

## 3.1 Cloudflare manual setup checklist

1. In Cloudflare Pages, open the connected GitHub project.
2. Settings → Builds & deployments:
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Settings → Environment variables:
   - Add the variables listed above to Production.
   - Add the same variables to Preview if branch previews are used.
   - Keep server-only values as encrypted Cloudflare variables and never
     expose them with a `VITE_` prefix.
4. Deployments → Retry deployment after changing variables.
5. After deploy, open:
   - `https://YOUR_DOMAIN/config.json` to confirm public auth config.
   - `https://YOUR_DOMAIN/api/health` to confirm server-side encrypted
     variables are present. The endpoint returns only variable names and
     boolean presence, never secret values.

## 4. Authentication config

The login UI reads `/config.json` before it renders sign-in methods. The
source file is `public/config.json`, and Vite copies it into the deployed
site during `npm run build`.

Set each authentication method to `true` or `false`:

```json
{
  "app": {
    "id": "ooe"
  },
  "auth": {
    "google": true,
    "apple": false,
    "x": true,
    "email": true
  }
}
```

- `app.id` is the optional initiator app id written to `auth_events`
  after a valid Supabase sign-in. Use a stable id such as `ooe`.
- `google: false` hides "Continue with Google".
- `apple: false` hides "Continue with Apple".
- `x: false` hides "Continue with X".
- `email: false` hides the email magic-link form.

After changing `public/config.json`, commit and redeploy the Pages project.
For a deployed site, you can verify the active config by opening
`https://YOUR_DOMAIN/config.json` in the browser.

If you enable `"x": true`, complete the X/Twitter provider setup in
`AUTH_SETUP.md` first. The X Developer Portal and Supabase provider
settings must share the same callback URL:

```text
https://YOUR_PROJECT.supabase.co/auth/v1/callback
```

## 5. Branch strategy

- `main` → Production deployment (your production domain).
- Any other branch (e.g. `dev`) → Preview deployment at an auto-generated
  `*.pages.dev` URL, useful for QA before merging.
- Add the preview URL pattern to Supabase Auth → URL Configuration →
  Redirect URLs so magic links work in preview too (e.g.
  `https://*.ooe.pages.dev/**`).

## 6. Custom domain (optional)

1. Workers & Pages → your project → Custom domains → Add domain.
2. Follow Cloudflare's DNS instructions (if the domain is already on
   Cloudflare DNS this is a one-click attach).
3. Update Supabase Auth redirect URLs to include the custom domain.

## 7. Post-deploy checks

- Sign up with a real email, confirm the magic link redirects back to the
  app and a session is established.
- Confirm a row is inserted into `auth_events` with `initiator_app_id`
  set to the value from `/config.json`.
- Reload the app after OTP verification and confirm it opens directly to
  the app while the Supabase session is active.
- Confirm the signed-in email appears in the top bar.
- Sign out and confirm the email field is prefilled with the last-used
  email, the sign-out notice appears, and the app does not open unless a
  valid Supabase session exists.
- Simulate a slow or failing Supabase/session load and confirm the app
  leaves "Loading OOE..." and returns to the sign-in screen.
- Confirm disabled sign-in methods are hidden according to `/config.json`.
- Open `/api/health` and confirm it returns `ok: true` after Cloudflare
  encrypted environment variables are configured.
- Create a topic, run research, confirm `research_runs`/`elements` rows
  appear in Supabase and are scoped to your user only.
- Sign in as a second test user and confirm you cannot see the first
  user's topics (RLS check).
- Reprioritize and confirm — check `decisions` rows write correctly and
  the topic status flips to `decided`.

## 8. Cost control (recommended before sharing widely)

- Cloudflare → your Pages project → add a Rate Limiting rule on
  `/api/research` (e.g. N requests per IP/user per hour) to cap Anthropic
  API spend.
- Optionally track research-run counts per user in Supabase and block
  new runs past a daily quota inside `functions/api/research.js`.
- Monitor Supabase Auth logs and usage limits, especially on free-tier
  projects. Repeated OTP requests can be throttled or delayed; loading
  and sign-in troubleshooting should include Supabase project status,
  Auth rate limits, and quota/paused-project checks.

## 9. Rollback

- Cloudflare Pages keeps a deployment history per project — any prior
  deployment can be promoted to Production instantly from the dashboard
  if a release breaks something.
