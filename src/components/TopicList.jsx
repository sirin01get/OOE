import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const STATUS_LABEL = {
  new: 'Not started',
  researching: 'Researching…',
  researched: 'Ready to prioritize',
  prioritized: 'Prioritized',
  decided: 'Decided'
}

export default function TopicList() {
  const [topics, setTopics] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function loadTopics() {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setTopics(data)
    setLoading(false)
  }

  useEffect(() => {
    loadTopics()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('topics')
      .insert({ title: title.trim(), user_id: userData.user.id })
    if (!error) {
      setTitle('')
      loadTopics()
    }
  }

  function routeFor(topic) {
    if (topic.status === 'new' || topic.status === 'researching') return `/topic/${topic.id}/research`
    if (topic.status === 'researched' || topic.status === 'prioritized') return `/topic/${topic.id}/prioritize`
    return `/topic/${topic.id}/decision`
  }

  return (
    <div className="screen">
      <h1>Topics</h1>
      <form onSubmit={handleAdd} className="topic-form">
        <input
          type="text"
          placeholder="What do you want to figure out?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Save topic</button>
      </form>

      {loading && <p className="muted">Loading…</p>}
      {!loading && topics.length === 0 && (
        <p className="empty-state">No topics yet. Save one above to start the loop.</p>
      )}

      <ul className="topic-list">
        {topics.map((t) => (
          <li key={t.id} className="topic-row" onClick={() => navigate(routeFor(t))}>
            <span className="topic-title">{t.title}</span>
            <span className={`status-badge status-${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
