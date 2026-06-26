import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableItem({ item, onToggleExclude }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`priority-row ${item.included ? '' : 'excluded'}`}
    >
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <span className="priority-content">{item.content}</span>
      <button className="ghost-btn small" onClick={() => onToggleExclude(item.id)}>
        {item.included ? 'Exclude' : 'Include'}
      </button>
    </li>
  )
}

export default function PrioritizeScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
    if (!run) return

    const { data: els } = await supabase
      .from('elements')
      .select('*')
      .eq('research_run_id', run.id)
      .order('proposed_rank', { ascending: true })

    const { data: existingDecisions } = await supabase
      .from('decisions')
      .select('*')
      .eq('topic_id', id)
      .order('user_rank', { ascending: true })

    if (existingDecisions && existingDecisions.length > 0) {
      const byElementId = Object.fromEntries((els || []).map((e) => [e.id, e]))
      const ordered = existingDecisions
        .map((d) => byElementId[d.element_id] && { ...byElementId[d.element_id], included: d.included })
        .filter(Boolean)
      setItems(ordered)
    } else {
      setItems((els || []).map((e) => ({ ...e, included: true })))
    }
  }

  useEffect(() => {
    load()
  }, [id])

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function toggleExclude(elementId) {
    setItems((prev) => prev.map((i) => (i.id === elementId ? { ...i, included: !i.included } : i)))
  }

  async function confirmPriorities() {
    setBusy(true)
    setError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session.access_token

    const decisions = items.map((item, idx) => ({
      element_id: item.id,
      user_rank: idx + 1,
      included: item.included
    }))

    const res = await fetch('/api/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic_id: id, decisions })
    })
    const body = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(body.error || 'Could not save decisions')
      return
    }
    navigate(`/topic/${id}/decision`)
  }

  if (!topic) return <p className="muted">Loading…</p>
  if (items.length === 0)
    return (
      <div className="screen">
        <p className="empty-state">No researched elements yet for this topic.</p>
        <button onClick={() => navigate(`/topic/${id}/research`)}>Go research first</button>
      </div>
    )

  return (
    <div className="screen">
      <button className="ghost-btn back-link" onClick={() => navigate(`/topic/${id}/research`)}>← Research</button>
      <h1>{topic.title}</h1>
      <p className="stage-label">Stage: Organize — set your priority and sequence</p>
      <p className="muted">Drag to reorder. Exclude anything that doesn't belong.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="priority-list">
            {items.map((item) => (
              <SortableItem key={item.id} item={item} onToggleExclude={toggleExclude} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="action-row">
        <button className="primary-btn" onClick={confirmPriorities} disabled={busy}>
          {busy ? 'Saving…' : 'Confirm priorities →'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
