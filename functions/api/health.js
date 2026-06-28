import { getMissingEnv, jsonResponse } from './_lib.js'

const REQUIRED_SERVER_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY'
]

export async function onRequestGet({ env }) {
  const variables = Object.fromEntries(
    REQUIRED_SERVER_ENV.map((name) => [name, Boolean(env[name])])
  )
  const missing = getMissingEnv(env, REQUIRED_SERVER_ENV)

  return jsonResponse(
    {
      ok: missing.length === 0,
      variables,
      missing,
      troubleshooting: missing.length === 0
        ? []
        : [
            'Cloudflare Pages -> project -> Settings -> Environment variables',
            'Add missing variables to Production and Preview if preview deployments are used',
            'Redeploy after saving variables'
          ]
    },
    missing.length === 0 ? 200 : 500
  )
}
