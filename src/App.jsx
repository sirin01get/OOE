import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { supabase, supabaseConfigError } from './lib/supabase.js'
import TopicList from './components/TopicList.jsx'
import ResearchScreen from './components/ResearchScreen.jsx'
import PrioritizeScreen from './components/PrioritizeScreen.jsx'
import DecisionSummary from './components/DecisionSummary.jsx'
import AuthGate from './components/AuthGate.jsx'

const DEFAULT_APP_ID = 'ooe'
const SESSION_LOAD_TIMEOUT_MS = 5000

async function loadInitiatorAppId() {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' })
    if (!response.ok) return DEFAULT_APP_ID
    const config = await response.json()
    return typeof config?.app?.id === 'string' && config.app.id.trim()
      ? config.app.id.trim()
      : DEFAULT_APP_ID
  } catch (err) {
    return DEFAULT_APP_ID
  }
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs)
    })
  ])
}

async function trackAuthEvent(session, eventType) {
  if (!session?.access_token || !session.user?.id) return

  const initiatorAppId = await loadInitiatorAppId()
  const trackingKey = `ooe:authTracked:${initiatorAppId}:${session.user.id}:${eventType}:${session.expires_at || 'session'}`
  if (sessionStorage.getItem(trackingKey)) return

  const response = await fetch('/api/auth/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      initiator_app_id: initiatorAppId,
      event_type: eventType
    })
  })

  if (response.ok) {
    sessionStorage.setItem(trackingKey, '1')
  }
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    let mounted = true
    if (!supabase) {
      setSession(null)
      return () => {
        mounted = false
      }
    }

    function applySession(sess, eventType = null) {
      if (!mounted) return
      if (sess?.user?.email) {
        localStorage.setItem('ooe:lastAuthEmail', sess.user.email)
      }
      if (eventType === 'SIGNED_IN') {
        trackAuthEvent(sess, 'signed_in').catch((err) => {
          console.warn('Could not track auth event', err)
        })
      }
      setSession(sess)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      applySession(sess, event)
    })

    withTimeout(
      supabase.auth.getSession(),
      SESSION_LOAD_TIMEOUT_MS,
      'Supabase session load timed out'
    )
      .then(({ data }) => {
        if (!mounted) return
        if (data.session) {
          applySession(data.session)
        } else {
          setSession((current) => (current === undefined ? null : current))
        }
      })
      .catch((err) => {
        console.warn('Could not load Supabase session', err)
        if (mounted) setSession((current) => (current === undefined ? null : current))
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    if (session?.user?.email) {
      localStorage.setItem('ooe:lastAuthEmail', session.user.email)
    }
    sessionStorage.setItem('ooe:postSignOut', '1')
    if (!supabase) {
      setSession(null)
      return
    }
    try {
      await withTimeout(supabase.auth.signOut(), SESSION_LOAD_TIMEOUT_MS, 'Supabase sign-out timed out')
    } catch (err) {
      console.warn('Could not complete Supabase sign-out before returning to login', err)
    } finally {
      setSession(null)
    }
  }

  if (session === undefined) {
    return <div className="loading-screen">Loading OOE…</div>
  }

  if (!session) {
    return <AuthGate startupError={supabaseConfigError?.message} />
  }

  const userEmail = session.user?.email

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-o">O</span>
            <span className="brand-arrow">→</span>
            <span className="brand-o">O</span>
            <span className="brand-arrow">→</span>
            <span className="brand-e">E</span>
          </Link>
          <div className="topbar-actions">
            {userEmail && <span className="user-email">{userEmail}</span>}
            <button className="ghost-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <Routes>
            <Route path="/" element={<TopicList />} />
            <Route path="/topic/:id/research" element={<ResearchScreen />} />
            <Route path="/topic/:id/prioritize" element={<PrioritizeScreen />} />
            <Route path="/topic/:id/decision" element={<DecisionSummary />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
