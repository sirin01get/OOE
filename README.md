# OOE — Observe → Organize → Execute

A small loop tool: save a topic, let an LLM research and propose a sequenced
set of key elements, re-prioritize them yourself, and save the final
sequence as your decision.

## Stack
- **Frontend:** React + Vite, static hosting on Cloudflare Pages
- **API:** Cloudflare Pages Functions (`/functions/api/*`)
- **Database/Auth:** Supabase (Postgres + RLS + magic-link auth)
- **Research:** Anthropic Claude API with the `web_search` tool, called server-side

## Local setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project URL/keys
   and your Anthropic API key:
   ```
   cp .env.example .env
   ```

3. Run the database migration in Supabase (SQL editor or CLI):
   ```
   migrations/001_init.sql
   ```
   This creates `topics`, `research_runs`, `elements`, `decisions`, and
   enables RLS scoped to `auth.uid()` on all four tables.

4. Enable email magic-link auth in your Supabase project (Auth → Providers
   → Email is on by default).

5. Run the frontend:
   ```
   npm run dev
   ```
   This serves the React app only. The `/api/*` functions need Cloudflare's
   dev runtime — see next step.

6. Run with Functions locally (after a build):
   ```
   npm run build
   npm run pages:dev
   ```
   `wrangler pages dev` serves `dist/` and the `/functions/api` routes
   together so the full app works end-to-end locally. Pass your env vars to
   wrangler via `--binding` flags or a `.dev.vars` file (wrangler convention)
   containing the server-side keys from `.env.example`.

## Deploying

See `DEPLOYMENT.md` for the full Cloudflare + Supabase deployment steps.

## Project structure

```
src/                  React app
  components/          TopicList, ResearchScreen, PrioritizeScreen, DecisionSummary, AuthGate
  lib/supabase.js      Browser Supabase client (anon key only)
functions/api/         Cloudflare Pages Functions (server-side)
  research.js          POST /api/research — calls Claude, saves elements
  decide.js            POST /api/decide — saves user's final ranked decisions
  _lib.js              Auth helpers, shared response helper
migrations/001_init.sql  Supabase schema + RLS policies
```

## Security notes
- The Anthropic API key and Supabase service-role key are **only** read in
  `functions/api/*` (server-side). They must be set as Cloudflare Pages
  secrets, never as `VITE_`-prefixed vars (those get bundled into the
  client).
- All data access from the API functions goes through a Supabase client
  authenticated as the calling user (their JWT, forwarded from the
  browser), so Row Level Security enforces per-user isolation even though
  the functions run server-side.
