import { createClient } from '@supabase/supabase-js'

// Builds a Supabase client authenticated as the calling user (RLS-respecting),
// by forwarding the user's access token from the Authorization header.
export function getUserClient(request, env) {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
}

// Service-role client for trusted server-side writes/reads that must bypass RLS
// (e.g. writing research results after verifying topic ownership separately).
export function getServiceClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
