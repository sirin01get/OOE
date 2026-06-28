import { getUserClient, jsonResponse } from '../_lib.js'

function cleanOptionalText(value, maxLength = 120) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export async function onRequestPost({ request, env }) {
  try {
    const supabase = getUserClient(request, env)
    if (!supabase) return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return jsonResponse({ error: 'Could not resolve authenticated user' }, 401)
    }

    const body = await request.json().catch(() => ({}))
    const initiatorAppId = cleanOptionalText(body.initiator_app_id)
    const eventType = cleanOptionalText(body.event_type, 40) || 'signed_in'
    const user = userData.user
    const provider =
      cleanOptionalText(user.app_metadata?.provider, 80) ||
      cleanOptionalText(user.identities?.[0]?.provider, 80)

    const { data, error } = await supabase
      .from('auth_events')
      .insert({
        user_id: user.id,
        initiator_app_id: initiatorAppId,
        provider,
        email: cleanOptionalText(user.email, 320),
        event_type: eventType
      })
      .select('id, initiator_app_id, provider, event_type, created_at')
      .single()

    if (error) {
      return jsonResponse({ error: 'Failed to track authentication event', detail: error.message }, 500)
    }

    return jsonResponse({ event: data })
  } catch (e) {
    return jsonResponse({ error: 'Unexpected server error', detail: String(e) }, 500)
  }
}
