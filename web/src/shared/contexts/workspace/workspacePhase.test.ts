import { describe, expect, it } from 'vitest'
import {
  sheetBootstrapReducer,
  workspacePhaseReducer,
  type SheetBootstrapPhase,
  type WorkspacePhase,
} from './workspacePhase'

describe('workspacePhaseReducer', () => {
  it('leaves import flow alone when restore finishes late', () => {
    const importing: WorkspacePhase = { kind: 'importing' }

    expect(workspacePhaseReducer(importing, { type: 'RESTORE_DONE' })).toEqual(importing)
  })

  it('clears import errors on CLEAR_IMPORT_ERROR', () => {
    const errored: WorkspacePhase = { kind: 'import_error', message: 'nope' }

    expect(workspacePhaseReducer(errored, { type: 'CLEAR_IMPORT_ERROR' })).toEqual({ kind: 'ready' })
  })
})

describe('sheetBootstrapReducer', () => {
  it('walks load → sync → ready', () => {
    let phase: SheetBootstrapPhase = { kind: 'idle' }

    phase = sheetBootstrapReducer(phase, { type: 'START_LOAD_CONFIG' })
    expect(phase).toEqual({ kind: 'loading_config' })
    phase = sheetBootstrapReducer(phase, { type: 'START_SYNC_LAYOUT' })
    expect(phase).toEqual({ kind: 'syncing_layout' })
    phase = sheetBootstrapReducer(phase, { type: 'SYNC_LAYOUT_DONE' })
    expect(phase).toEqual({ kind: 'ready' })
  })

  it('surfaces sync failures and can dismiss them', () => {
    const syncing: SheetBootstrapPhase = { kind: 'syncing_layout' }
    const failed = sheetBootstrapReducer(syncing, { type: 'SYNC_LAYOUT_FAIL', message: 'timeout' })

    expect(failed).toEqual({ kind: 'error', message: 'timeout' })
    expect(sheetBootstrapReducer(failed, { type: 'DISMISS_ERROR' })).toEqual({ kind: 'ready' })
  })
})
