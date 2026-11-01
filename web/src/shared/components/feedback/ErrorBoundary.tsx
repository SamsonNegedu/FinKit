import { Component, ReactNode } from 'react'
import { clearSession } from '@/shared/utils/storage'

interface State {
  error: Error | null
}

// Catches render errors so one bad file or saved session can't leave a blank page
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="min-h-screen bg-midnight-950 flex items-center justify-center p-6">
        <div className="card max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
          <p className="text-sm text-midnight-300">{this.state.error.message}</p>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              className="btn-primary"
              onClick={async () => {
                await clearSession()
                window.location.reload()
              }}
            >
              Clear saved data and reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
