import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function DecisionSummary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)
  const [rows, setRows] = useState([])

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('topics').select('*').eq('id', id).single()
      setTopic(t)

      const { data: decisions } = await supabase
        .from('decisions')
        .select('*, elements:element_id(content, source_url)')
        .eq('topic_id', id)
        .order('user_rank', { ascending: true })

      setRows(decisions || [])
    }
    load()
  }, [id])

  if (!topic) return <p className="muted">Loading…</p>

  return (
    <div className="screen">
      <button className="ghost-btn back-link" onClick={() => navigate('/')}>← Topics</button>
      <h1>{topic.title}</h1>
      <p className="stage-label">Stage: Execute — decided sequence</p>

      {rows.length === 0 ? (
        <p className="empty-state">No decisions saved yet.</p>
      ) : (
        <ol className="element-list decided-list">
          {rows
            .filter((r) => r.included)
            .map((r) => (
              <li key={r.id} className="element-row">
                <span className="element-content">{r.elements?.content}</span>
                {r.elements?.source_url && (
                  <a className="source-link" href={r.elements.source_url} target="_blank" rel="noreferrer">
                    source
                  </a>
                )}
              </li>
            ))}
        </ol>
      )}

      <div className="action-row">
        <button onClick={() => navigate(`/topic/${id}/prioritize`)}>Edit priorities</button>
      </div>
    </div>
  )
}
