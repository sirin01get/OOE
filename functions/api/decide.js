import { getUserClient, jsonResponse } from './_lib.js'

export async function onRequestPost({ request, env }) {
  try {
    const { topic_id, decisions } = await request.json()
    if (!topic_id || !Array.isArray(decisions)) {
      return jsonResponse({ error: 'topic_id and decisions[] are required' }, 400)
    }

    const supabase = getUserClient(request, env)
    if (!supabase) return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401)

    const { data: topic, error: topicErr } = await supabase
      .from('topics')
      .select('id')
      .eq('id', topic_id)
      .single()
    if (topicErr || !topic) return jsonResponse({ error: 'Topic not found or not owned by user' }, 404)

    // Replace prior decisions for this topic (simple overwrite strategy)
    await supabase.from('decisions').delete().eq('topic_id', topic_id)

    const rows = decisions.map((d, idx) => ({
      topic_id,
      element_id: d.element_id,
      user_rank: d.user_rank ?? idx + 1,
      included: d.included !== false,
      note: d.note || null
    }))

    const { data, error } = await supabase.from('decisions').insert(rows).select()
    if (error) return jsonResponse({ error: 'Failed to save decisions', detail: error.message }, 500)

    await supabase.from('topics').update({ status: 'decided' }).eq('id', topic_id)

    return jsonResponse({ decisions: data })
  } catch (e) {
    return jsonResponse({ error: 'Unexpected server error', detail: String(e) }, 500)
  }
}
