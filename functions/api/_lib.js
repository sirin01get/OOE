import { createClient } from '@supabase/supabase-js'

export function getMissingEnv(env, names) {
  return names.filter((name) => !env?.[name])
}

export function envErrorResponse(missing) {
  return jsonResponse(
    {
      error: 'Cloudflare environment variables are not configured',
      missing,
      troubleshooting: [
        'Cloudflare Pages -> project -> Settings -> Environment variables',
        'Add the missing variables to both Production and Preview if preview deployments are used',
        'Redeploy after saving variables',
        'Open /api/health to verify server variable presence'
      ]
    },
    500
  )
}

// Builds a Supabase client authenticated as the calling user (RLS-respecting),
// by forwarding the user's access token from the Authorization header.
export function getUserClient(request, env) {
  const missing = getMissingEnv(env, ['SUPABASE_URL', 'SUPABASE_ANON_KEY'])
  if (missing.length > 0) return { envResponse: envErrorResponse(missing) }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return { authResponse: jsonResponse({ error: 'Missing or invalid Authorization header' }, 401) }

  return {
    client: createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
  }
}

// Service-role client for trusted server-side writes/reads that must bypass RLS
// (e.g. writing research results after verifying topic ownership separately).
export function getServiceClient(env) {
  const missing = getMissingEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  if (missing.length > 0) return { envResponse: envErrorResponse(missing) }

  return { client: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
