# OOE Deployment Plan

## 1. Supabase

1. In your Supabase project's SQL editor, run `migrations/001_init.sql`.
2. Confirm RLS is enabled on `topics`, `research_runs`, `elements`,
   `decisions` (the migration enables it, but verify in Table Editor →
   each table → RLS toggle).
3. Auth → Providers: confirm Email (magic link) is enabled. Set the site
   URL and redirect URLs (Auth → URL Configuration) to your Cloudflare
   Pages domain, e.g. `https://ooe.pages.dev` and any custom domain.
4. Copy three values for later: Project URL, anon public key, service role
   key (Settings → API).

## 2. GitHub

1. Push this project to a new GitHub repository.
2. Keep `.env` out of the repo (already in `.gitignore`).

## 3. Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to
   Git → select the repo.
2. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Environment variables (Settings → Environment variables), set for both
   Production and Preview:
   - `VITE_SUPABASE_URL` — client-safe, Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — client-safe, Supabase anon key
   - `SUPABASE_URL` — server-side, same project URL
   - `SUPABASE_ANON_KEY` — server-side, same anon key (used to build a
     user-scoped client in Functions)
   - `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never expose to client
   - `ANTHROPIC_API_KEY` — server-side only
4. Deploy. Cloudflare builds the static site and auto-detects
   `functions/api/*.js` as Pages Functions, deploying them alongside.

## 4. Branch strategy

- `main` → Production deployment (your production domain).
- Any other branch (e.g. `dev`) → Preview deployment at an auto-generated
  `*.pages.dev` URL, useful for QA before merging.
- Add the preview URL pattern to Supabase Auth → URL Configuration →
  Redirect URLs so magic links work in preview too (e.g.
  `https://*.ooe.pages.dev/**`).

## 5. Custom domain (optional)

1. Workers & Pages → your project → Custom domains → Add domain.
2. Follow Cloudflare's DNS instructions (if the domain is already on
   Cloudflare DNS this is a one-click attach).
3. Update Supabase Auth redirect URLs to include the custom domain.

## 6. Post-deploy checks

- Sign up with a real email, confirm the magic link redirects back to the
  app and a session is established.
- Create a topic, run research, confirm `research_runs`/`elements` rows
  appear in Supabase and are scoped to your user only.
- Sign in as a second test user and confirm you cannot see the first
  user's topics (RLS check).
- Reprioritize and confirm — check `decisions` rows write correctly and
  the topic status flips to `decided`.

## 7. Cost control (recommended before sharing widely)

- Cloudflare → your Pages project → add a Rate Limiting rule on
  `/api/research` (e.g. N requests per IP/user per hour) to cap Anthropic
  API spend.
- Optionally track research-run counts per user in Supabase and block
  new runs past a daily quota inside `functions/api/research.js`.

## 8. Rollback

- Cloudflare Pages keeps a deployment history per project — any prior
  deployment can be promoted to Production instantly from the dashboard
  if a release breaks something.
