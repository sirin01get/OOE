import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ResearchScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)
  const [elements, setElements] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data: t } = await supabase.from('topics').select('*').eq('id', id).single()
    setTopic(t)

    const { data: run } = await supabase
      .from('research_runs')
      .select('id')
      .eq('topic_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (run) {
      const { data: els } = await supabase
        .from('elements')
        .select('*')
        .eq('research_run_id', run.id)
        .order('proposed_rank', { ascending: true })
      setElements(els || [])
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function runResearch() {
    setBusy(true)
    setError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session.access_token

    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic_id: id })
    })
    const body = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(body.error || 'Research failed')
      return
    }
    await load()
  }

  if (!topic) return <p className="muted">Loading…</p>

  return (
    <div className="screen">
      <button className="ghost-btn back-link" onClick={() => navigate('/')}>← Topics</button>
      <h1>{topic.title}</h1>
      <p className="stage-label">Stage: Observe — research the topic</p>

      {elements.length === 0 ? (
        <div className="empty-state">
          <p>No research yet for this topic.</p>
          <button onClick={runResearch} disabled={busy}>
            {busy ? 'Researching…' : 'Research this topic'}
          </button>
          {error && <p className="form-error">{error}</p>}
        </div>
      ) : (
        <>
          <p className="muted">Proposed key elements, in suggested sequence:</p>
          <ol className="element-list">
            {elements.map((e) => (
              <li key={e.id} className="element-row">
                <span className="element-content">{e.content}</span>
                {e.source_url && (
                  <a className="source-link" href={e.source_url} target="_blank" rel="noreferrer">
                    source
                  </a>
                )}
              </li>
            ))}
          </ol>
          <div className="action-row">
            <button onClick={runResearch} disabled={busy}>
              {busy ? 'Re-researching…' : 'Re-run research'}
            </button>
            <button className="primary-btn" onClick={() => navigate(`/topic/${id}/prioritize`)}>
              Continue to prioritization →
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </>
      )}
    </div>
  )
}
