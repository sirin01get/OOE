import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AuthGate() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setSent(true)
  }

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

        {sent ? (
          <p className="auth-sent">Check {email} for a sign-in link.</p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">Send sign-in link</button>
            {error && <p className="form-error">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
