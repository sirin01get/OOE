import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import SelfCheck from './components/SelfCheck.jsx'
import './styles.css'

// import.meta.env.DEV is true only when running via `npm run dev`
// (Vite's local dev server). It is false in any built bundle — whether
// that bundle is served locally via `wrangler pages dev` or deployed to
// Cloudflare — because building "bakes" DEV to false at build time.
if (import.meta.env.DEV) {
  console.log('Local')
  console.log('Environment variables (import.meta.env):')
  console.table(import.meta.env)
} else {
  console.log('Live')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SelfCheck>
        <App />
      </SelfCheck>
    </ErrorBoundary>
  </React.StrictMode>
)
