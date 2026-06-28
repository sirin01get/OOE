import React, { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from '../lib/supabase.js'

const DEFAULT_AUTH_CONFIG = {
  google: true,
  apple: true,
  x: true,
  email: true
}
const CONFIG_LOAD_TIMEOUT_MS = 4000

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9A8.78 8.78 0 0 0 17.64 9.2z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.87-3.06.87-2.36 0-4.36-1.6-5.08-3.74H.9v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.92 10.69A5.4 5.4 0 0 1 3.64 9c0-.59.1-1.16.28-1.69V4.98H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.02l3.02-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .9 4.98l3.02 2.33C4.64 5.18 6.64 3.58 9 3.58z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-23.6 1.4-51 16.5-66.7 35-17.5 19.8-27.8 44.3-25.6 71.9 26.1-2 49.9-15.2 68.3-34.4z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 1200 1227" aria-hidden="true" fill="currentColor">
      <path d="M714.2 519.3 1160.9 0h-105.9L667.1 450.9 357.3 0H0l468.5 681.8L0 1226.4h105.9l409.6-476.2 327.2 476.2H1200L714.2 519.3Zm-145 168.5-47.5-67.9L144 79.7h162.6l304.9 436.2 47.5 67.9 396 566.2H892.4L569.2 687.8Z" />
    </svg>
  )
}

export default function AuthGate({ startupError = null }) {
  const [email, setEmail] = useState(() => localStorage.getItem('ooe:lastAuthEmail') || '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [oauthBusy, setOauthBusy] = useState(null) // 'google' | 'apple' | 'x' | null
  const [authConfig, setAuthConfig] = useState(null)
  const [postSignOut, setPostSignOut] = useState(() => sessionStorage.getItem('ooe:postSignOut') === '1')
  const rememberedEmail = localStorage.getItem('ooe:lastAuthEmail')

  useEffect(() => {
    let cancelled = false

    async function loadConfig() {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), CONFIG_LOAD_TIMEOUT_MS)
      try {
        const response = await fetch('/config.json', {
          cache: 'no-store',
          signal: controller.signal
        })
        if (!response.ok) throw new Error('Could not load auth config')
        const config = await response.json()
        const auth = config?.auth || {}
        if (!cancelled) {
          setAuthConfig({
            google: auth.google !== false,
            apple: auth.apple !== false,
            x: auth.x !== false,
            email: auth.email !== false
          })
        }
      } catch (err) {
        console.warn('Could not load auth config; using defaults', err)
        if (!cancelled) setAuthConfig(DEFAULT_AUTH_CONFIG)
      } finally {
        window.clearTimeout(timeout)
      }
    }

    loadConfig()
    if (sessionStorage.getItem('ooe:postSignOut') === '1') {
      sessionStorage.removeItem('ooe:postSignOut')
    }
    return () => {
      cancelled = true
    }
  }, [])

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError(supabaseConfigError?.message || 'Supabase is not configured.')
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) setError(error.message)
    else {
      localStorage.setItem('ooe:lastAuthEmail', email)
      setSent(true)
    }
  }

  async function handleOAuth(provider) {
    setError(null)
    if (!supabase) {
      setError(supabaseConfigError?.message || 'Supabase is not configured.')
      return
    }
    setOauthBusy(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    })
    // On success the browser redirects away immediately, so this only
    // ever runs if something went wrong before the redirect happened.
    if (error) {
      setError(error.message)
      setOauthBusy(null)
    }
  }

  if (!authConfig) {
    return <div className="loading-screen">Loading OOE…</div>
  }

  const hasOAuth = authConfig.google || authConfig.apple || authConfig.x
  const hasEmail = authConfig.email
  const hasAnyAuth = hasOAuth || hasEmail

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand brand-large">
          <span className="brand-o">O</span>
          <span className="brand-arrow">→</span>
          <span className="brand-o">O</span>
          <span className="brand-arrow">→</span>
          <span className="brand-e">E</span>
        </div>
        <p className="auth-tagline">Observe. Organize. Execute.</p>

        {postSignOut && (
          <p className="auth-notice">Signed out. Verify your email to continue.</p>
        )}

        {hasOAuth && (
          <div className="oauth-buttons">
            {authConfig.google && (
              <button
                type="button"
                className="oauth-btn"
                onClick={() => handleOAuth('google')}
                disabled={oauthBusy !== null}
              >
                <GoogleIcon />
                {oauthBusy === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </button>
            )}
            {authConfig.apple && (
              <button
                type="button"
                className="oauth-btn oauth-btn-apple"
                onClick={() => handleOAuth('apple')}
                disabled={oauthBusy !== null}
              >
                <AppleIcon />
                {oauthBusy === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
              </button>
            )}
            {authConfig.x && (
              <button
                type="button"
                className="oauth-btn oauth-btn-x"
                onClick={() => handleOAuth('x')}
                disabled={oauthBusy !== null}
              >
                <XIcon />
                {oauthBusy === 'x' ? 'Redirecting…' : 'Continue with X'}
              </button>
            )}
          </div>
        )}

        {hasOAuth && hasEmail && <div className="auth-divider"><span>or</span></div>}

        {hasEmail && (
          sent ? (
            <p className="auth-sent">Check {email} for a sign-in link. After verification, this browser will open OOE directly while the Supabase session is active.</p>
          ) : (
            <form onSubmit={handleEmailSubmit} className="auth-form">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (postSignOut) setPostSignOut(false)
                }}
                disabled={oauthBusy !== null}
              />
              <button type="submit" disabled={oauthBusy !== null}>
                Send sign-in link
              </button>
              {rememberedEmail && (
                <p className="remembered-email">Last used: {rememberedEmail}</p>
              )}
            </form>
          )
        )}

        {!hasAnyAuth && <p className="form-error">No sign-in methods are currently available.</p>}

        {(startupError || error) && <p className="form-error">{startupError || error}</p>}
      </div>
    </div>
  )
}
