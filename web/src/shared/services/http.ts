export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function getHeaders(contentType = true): HeadersInit {
  const headers: HeadersInit = {}
  if (contentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}
