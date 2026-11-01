/** Result of returning from the bank OAuth redirect (?bank=connected | ?bank=error). */
export type BankConnectReturnPhase =
  | { kind: 'none' }
  | { kind: 'success'; connectionId?: string }
  | { kind: 'error'; reason: 'denied' | 'expired' | 'invalid' | 'failed' }

export type ConnectionCardOperation =
  | { kind: 'idle' }
  | { kind: 'sync'; connectionId: string }
  | { kind: 'disconnect'; connectionId: string }
  | { kind: 'connect_redirect' }

export function parseBankConnectReturn(search: { bank?: string; c?: string; reason?: string }): BankConnectReturnPhase {
  if (!search.bank) {
    return { kind: 'none' }
  }
  if (search.bank === 'connected') {
    return { kind: 'success', connectionId: search.c }
  }
  const reason = search.reason

  if (reason === 'denied' || reason === 'expired' || reason === 'invalid' || reason === 'failed') {
    return { kind: 'error', reason }
  }

  return { kind: 'error', reason: 'failed' }
}

export const BANK_CONNECT_ERROR_COPY: Record<Extract<BankConnectReturnPhase, { kind: 'error' }>['reason'], string> = {
  denied: 'You declined access at the bank.',
  expired: 'That approval took too long. Try again.',
  invalid: "That link wasn't valid. Try again.",
  failed: "Couldn't finish connecting. Try again.",
}

export function connectionOperationFromMutations(input: {
  syncPending: boolean
  syncId?: string
  disconnectPending: boolean
  disconnectId?: string
  connectPending: boolean
}): ConnectionCardOperation {
  if (input.connectPending) {
    return { kind: 'connect_redirect' }
  }
  if (input.syncPending && input.syncId) {
    return { kind: 'sync', connectionId: input.syncId }
  }
  if (input.disconnectPending && input.disconnectId) {
    return { kind: 'disconnect', connectionId: input.disconnectId }
  }

  return { kind: 'idle' }
}

export function isConnectionBusy(op: ConnectionCardOperation, connectionId: string): boolean {
  if (op.kind === 'idle' || op.kind === 'connect_redirect') {
    return false
  }

  return op.connectionId === connectionId
}
