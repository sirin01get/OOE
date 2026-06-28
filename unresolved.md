# Unresolved Issues

## 2026-06-28 - Git-connected Cloudflare Pages deployment

Status: unresolved, bypassed with direct Wrangler Pages deployment.

What happened:

- Cloudflare Git deployment builds successfully with `npm run build`.
- The deployment step has repeatedly failed while using the Git-connected
  Cloudflare Pages path.
- Earlier logs showed Cloudflare running `npx wrangler deploy`, which is
  the Workers deploy command and not valid for this Pages app.
- Direct deploy to project `ooe` failed because that Pages project does
  not exist in the active Cloudflare account.
- `npx wrangler pages project list` showed the existing Pages project is
  `privyooe-pages`.

Current workaround:

- Build locally with `npm run build`.
- Deploy directly with:

```bash
npm run deploy
```

or:

```bash
npx wrangler pages deploy dist --project-name privyooe-pages
```

Successful bypass deployment:

- Date: 2026-06-28
- Project: `privyooe-pages`
- Preview URLs:
  - `https://720af6e0.privyooe-pages.pages.dev`
  - `https://0e321ff8.privyooe-pages.pages.dev`

Current direct-deploy verification:

- `/config.json` returns `200 OK`.
- `/api/health` returns `ok: false` because the direct-upload project is
  missing server-side Cloudflare variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`

Manual follow-up:

1. In Cloudflare, decide whether this project should stay direct-upload
   (`Git Provider: No`) or be reconnected to GitHub.
2. If reconnecting GitHub, ensure the Pages project name remains
   `privyooe-pages`.
3. Use build command `npm run build`, output directory `dist`, Node 22+.
4. Leave deploy command blank if Cloudflare handles Pages output
   automatically; otherwise use `npm run deploy`.
5. Confirm Production and Preview environment variables are both set.
6. For the existing direct-upload project, add the missing server-side
   variables listed above, then redeploy and recheck `/api/health`.
