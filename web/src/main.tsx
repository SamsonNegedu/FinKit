import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { AppStateProvider } from './app/AppState'
import { queryClient, router } from './app/router'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <RouterProvider router={router} />
        </AppStateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
