import { API_BASE, getHeaders } from './http'

export class ApiError extends Error {}

/** JSON request to the FinKit API (`/api…`). CSRF header is included on non-GET requests. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined
  let res: Response

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...getHeaders(hasBody),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError("Couldn't reach FinKit's server.")
  }
  const body = res.status === 204 ? {} : await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(typeof body.error === 'string' ? body.error : 'Something went wrong.')
  }

  return body as T
}

export function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }
}
