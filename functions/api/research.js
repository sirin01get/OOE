import { getUserClient, jsonResponse } from './_lib.js'

const RESEARCH_PROMPT = (topic) => `You are a research assistant. Research the topic below using web search.

Topic: "${topic}"

Return ONLY a JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "elements": [
    { "content": "string, one key element/fact/step, concise", "source_url": "string or null", "rank": 1 }
  ]
}

Rules:
- Produce 5 to 10 key elements.
- Order them in the most logical, useful sequence for someone learning or acting on this topic (rank starts at 1).
- Each element must be a single, specific, actionable or factual point — not a vague heading.
- Include the most relevant source_url you used for each element, when available.
- Do not include any text outside the JSON object.`

export async function onRequestPost({ request, env }) {
  try {
    const { topic_id } = await request.json()
    if (!topic_id) return jsonResponse({ error: 'topic_id is required' }, 400)

    const supabase = getUserClient(request, env)
    if (!supabase) return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401)

    // Fetch topic, scoped by RLS to the authenticated user
    const { data: topic, error: topicErr } = await supabase
      .from('topics')
      .select('id, title, user_id')
      .eq('id', topic_id)
      .single()

    if (topicErr || !topic) return jsonResponse({ error: 'Topic not found or not owned by user' }, 404)

    await supabase.from('topics').update({ status: 'researching' }).eq('id', topic_id)

    const model = 'claude-sonnet-4-6'
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: RESEARCH_PROMPT(topic.title) }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      await supabase.from('topics').update({ status: 'new' }).eq('id', topic_id)
      return jsonResponse({ error: 'Research call failed', detail: errText }, 502)
    }

    const result = await anthropicRes.json()

    // Extract text blocks (skip tool_use / mcp blocks), then parse JSON
    const textBlocks = (result.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    let parsed
    try {
      const cleaned = textBlocks.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      await supabase.from('topics').update({ status: 'new' }).eq('id', topic_id)
      return jsonResponse({ error: 'Could not parse research output', raw: textBlocks }, 502)
    }

    const elementsInput = Array.isArray(parsed.elements) ? parsed.elements : []
    if (elementsInput.length === 0) {
      await supabase.from('topics').update({ status: 'new' }).eq('id', topic_id)
      return jsonResponse({ error: 'Research returned no elements' }, 502)
    }

    // Insert research_run
    const { data: run, error: runErr } = await supabase
      .from('research_runs')
      .insert({ topic_id, model, raw_response: result })
      .select()
      .single()

    if (runErr) return jsonResponse({ error: 'Failed to save research run', detail: runErr.message }, 500)

    const rows = elementsInput.map((e, idx) => ({
      research_run_id: run.id,
      content: e.content,
      source_url: e.source_url || null,
      proposed_rank: e.rank ?? idx + 1
    }))

    const { data: elements, error: elErr } = await supabase.from('elements').insert(rows).select()
    if (elErr) return jsonResponse({ error: 'Failed to save elements', detail: elErr.message }, 500)

    await supabase.from('topics').update({ status: 'researched' }).eq('id', topic_id)

    return jsonResponse({ run_id: run.id, elements })
  } catch (e) {
    return jsonResponse({ error: 'Unexpected server error', detail: String(e) }, 500)
  }
}
