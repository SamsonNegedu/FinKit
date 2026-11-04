import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/app/routes/appRouteTree'

export const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

const stringifySearch = (search: Record<string, unknown>) => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, String(item))
    }
  }
  const text = params.toString()

  return text ? `?${text}` : ''
}
const parseSearch = (query: string) => {
  const params = new URLSearchParams(query)
  const out: Record<string, unknown> = {}

  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)

    out[key] = all.length > 1 ? all : all[0]
  }

  return out
}

export const router = createRouter({
  routeTree,
  stringifySearch,
  parseSearch,
  basepath: '/app',
  context: { queryClient },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
