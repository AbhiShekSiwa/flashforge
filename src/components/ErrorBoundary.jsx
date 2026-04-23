import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Log to console for debugging; no external error service in v1
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      const backHref = this.props.backHref ?? '/'
      return (
        <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Something went wrong.</h2>
          <p className="text-sm text-zinc-400 mb-6">
            An unexpected error occurred in this study mode.
          </p>
          <a
            href={backHref}
            className="h-10 px-5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm inline-flex items-center"
          >
            ← Back to Set
          </a>
        </main>
      )
    }

    return this.props.children
  }
}
