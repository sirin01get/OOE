import { jsonResponse } from './_lib.js'

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
  const missing = REQUIRED_SERVER_ENV.filter((name) => !env[name])

  return jsonResponse(
    {
      ok: missing.length === 0,
      variables,
      missing
    },
    missing.length === 0 ? 200 : 500
  )
}
