import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Runs a few cheap checks on startup and shows a clear diagnostic screen
// instead of a blank page if something basic is misconfigured.
// Wrap <App /> with this in main.jsx.
export default function SelfCheck({ children }) {
  const [status, setStatus] = useState({ state: 'checking', checks: [] })

  useEffect(() => {
    runChecks()
  }, [])

  async function runChecks() {
    const checks = []

    const url = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    checks.push({
      label: 'VITE_SUPABASE_URL is set',
      ok: Boolean(url),
      detail: url ? url : 'Missing. Check .env exists at project root (next to package.json), named exactly ".env", and restart the dev server.'
    })

    checks.push({
      label: 'VITE_SUPABASE_ANON_KEY is set',
      ok: Boolean(anonKey),
      detail: anonKey ? `${anonKey.slice(0, 12)}…` : 'Missing. Same cause as above — check .env and restart.'
    })

    if (!url || !anonKey) {
      setStatus({ state: 'fail', checks })
      return
    }

    const looksValid = /^https:\/\/.+\.supabase\.co$/.test(url)
    checks.push({
      label: 'VITE_SUPABASE_URL looks well-formed',
      ok: looksValid,
      detail: looksValid ? 'OK' : `Expected something like https://xxxx.supabase.co, got: ${url}`
    })

    try {
      const { error } = await supabase.auth.getSession()
      checks.push({
        label: 'Can reach Supabase Auth API',
        ok: !error,
        detail: error ? error.message : 'OK'
      })
    } catch (e) {
      checks.push({
        label: 'Can reach Supabase Auth API',
        ok: false,
        detail: `Network error: ${e.message}. Check the URL is correct and you have internet access.`
      })
    }

    const allOk = checks.every((c) => c.ok)
    setStatus({ state: allOk ? 'ok' : 'fail', checks })
  }

  if (status.state === 'checking') {
    return <div className="selfcheck-screen">Running startup checks…</div>
  }

  if (status.state === 'fail') {
    return (
      <div className="selfcheck-screen">
        <h2>OOE couldn't start</h2>
        <p className="muted">One or more startup checks failed. This is why you may be seeing a blank page.</p>
        <ul className="selfcheck-list">
          {status.checks.map((c, i) => (
            <li key={i} className={c.ok ? 'check-pass' : 'check-fail'}>
              <strong>{c.ok ? '✓' : '✗'} {c.label}</strong>
              <div className="check-detail">{c.detail}</div>
            </li>
          ))}
        </ul>
        <button onClick={() => { setStatus({ state: 'checking', checks: [] }); runChecks() }}>
          Re-run checks
        </button>
      </div>
    )
  }

  return children
}
