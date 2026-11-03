/** HTTP status and body for a failed sync, from the provider failure kind. */
export function syncFailureHttpStatus(kind: string): number {
  if (kind === 'consent_expired') {
    return 409
  }
  if (kind === 'rate_limited') {
    return 429
  }
  if (kind === 'too_large') {
    return 422
  }

  return 502
}

export function syncFailureErrorBody(kind: string): { error: string } {
  if (kind === 'consent_expired') {
    return { error: 'expired' }
  }

  return { error: kind }
}
