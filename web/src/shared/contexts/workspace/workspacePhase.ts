import type { RawTransaction } from '@/shared/types'

export type PendingImportPayload = {
  incoming: RawTransaction[]
  duplicates: number
  fileName: string
}

/** Workspace lifecycle for session restore and file import (not sheet bootstrap). */
export type WorkspacePhase =
  | { kind: 'restoring' }
  | { kind: 'ready' }
  | { kind: 'importing' }
  | { kind: 'duplicate_prompt'; pending: PendingImportPayload }
  | { kind: 'import_error'; message: string }

export type WorkspacePhaseAction =
  | { type: 'RESTORE_DONE' }
  | { type: 'IMPORT_START' }
  | { type: 'IMPORT_DONE' }
  | { type: 'IMPORT_FAIL'; message: string }
  | { type: 'DUPLICATE_PROMPT'; pending: PendingImportPayload }
  | { type: 'DUPLICATE_RESOLVED' }
  | { type: 'CLEAR_IMPORT_ERROR' }

export function workspacePhaseReducer(phase: WorkspacePhase, action: WorkspacePhaseAction): WorkspacePhase {
  switch (action.type) {
    case 'RESTORE_DONE':
      if (phase.kind === 'importing' || phase.kind === 'duplicate_prompt') {
        return phase
      }

      return phase.kind === 'import_error' ? phase : { kind: 'ready' }
    case 'IMPORT_START':
      return { kind: 'importing' }
    case 'IMPORT_DONE':
    case 'DUPLICATE_RESOLVED':
      return { kind: 'ready' }
    case 'IMPORT_FAIL':
      return { kind: 'import_error', message: action.message }
    case 'DUPLICATE_PROMPT':
      return { kind: 'duplicate_prompt', pending: action.pending }
    case 'CLEAR_IMPORT_ERROR':
      return phase.kind === 'import_error' ? { kind: 'ready' } : phase
    default:
      return phase
  }
}

export function isRestoringPhase(phase: WorkspacePhase): boolean {
  return phase.kind === 'restoring'
}

export function isImportingPhase(phase: WorkspacePhase): boolean {
  return phase.kind === 'importing'
}

export function importErrorFromPhase(phase: WorkspacePhase): string | null {
  return phase.kind === 'import_error' ? phase.message : null
}

export function pendingImportFromPhase(phase: WorkspacePhase): PendingImportPayload | null {
  return phase.kind === 'duplicate_prompt' ? phase.pending : null
}

export type SheetBootstrapPhase =
  | { kind: 'idle' }
  | { kind: 'loading_config' }
  | { kind: 'syncing_layout' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string }
