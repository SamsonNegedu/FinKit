import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { AppStateProvider } from '@/shared/contexts/AppState'
import { queryClient, router } from '@/app/router'
import { TooltipProvider } from '@/shared/components/Tooltip'
import ErrorBoundary from '@/shared/components/feedback/ErrorBoundary'
import '@/styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </AppStateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
