export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function getHeaders(contentType = true): HeadersInit {
  // The API only accepts changing requests that carry this header, which a plain cross-site form cannot send
  const headers: HeadersInit = { 'X-FinKit': '1' }

  if (contentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}
