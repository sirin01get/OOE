import React from 'react'

// Catches any uncaught error during render/lifecycle in the component tree
// below it and shows a readable message instead of a blank white page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('OOE crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="selfcheck-screen">
          <h2>Something went wrong</h2>
          <p className="muted">The app hit an unexpected error and stopped rendering.</p>
          <pre className="check-detail">{String(this.state.error?.message || this.state.error)}</pre>
          <p className="muted">Open DevTools → Console for the full stack trace.</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
