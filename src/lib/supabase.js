import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const urlLooksValid = typeof url === 'string' && /^https:\/\/.+\.supabase\.co$/.test(url)

export const supabaseConfigError = (() => {
  const missing = []
  if (!url) missing.push('VITE_SUPABASE_URL')
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    return {
      missing,
      message: `Missing client environment variables: ${missing.join(', ')}`
    }
  }

  if (!urlLooksValid) {
    return {
      missing: [],
      message: `VITE_SUPABASE_URL must look like https://PROJECT.supabase.co. Current value: ${url}`
    }
  }

  return null
})()

export const supabase = supabaseConfigError
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
