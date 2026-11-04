import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiJson } from './apiClient'

vi.mock('./http', () => ({
  API_BASE: 'https://example.test',
  getHeaders: (withBody: boolean) => (withBody ? { 'Content-Type': 'application/json', 'X-Finkit': '1' } : {}),
}))

describe('apiJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { id: 1 } }),
      }),
    )

    const body = await apiJson<{ success: true; data: { id: number } }>('/api/budgets')

    expect(body.data.id).toBe(1)
  })

  it('throws ApiError with server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad category' }),
      }),
    )

    await expect(apiJson('/api/budgets', { method: 'POST', body: '{}' })).rejects.toThrow('Bad category')
  })

  it('throws when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(apiJson('/api/budgets')).rejects.toBeInstanceOf(ApiError)
  })
})
