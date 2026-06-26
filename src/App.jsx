import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import TopicList from './components/TopicList.jsx'
import ResearchScreen from './components/ResearchScreen.jsx'
import PrioritizeScreen from './components/PrioritizeScreen.jsx'
import DecisionSummary from './components/DecisionSummary.jsx'
import AuthGate from './components/AuthGate.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="loading-screen">Loading OOE…</div>
  }

  if (!session) {
    return <AuthGate />
  }

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
          <button className="ghost-btn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
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
