export type SettingsAsyncOperation =
  | { kind: 'idle' }
  | { kind: 'loading_config' }
  | { kind: 'loading_tabs' }
  | { kind: 'syncing_layout' }
  | { kind: 'saving' }

export type SettingsAsyncAction =
  | { type: 'START'; operation: Exclude<SettingsAsyncOperation, { kind: 'idle' }>['kind'] }
  | { type: 'DONE' }
  | { type: 'FAIL'; message: string }
  | { type: 'CLEAR_ERROR' }

export type SettingsAsyncState = {
  operation: SettingsAsyncOperation
  sheetError: string
  syncMessage: string
}

export const initialSettingsAsyncState: SettingsAsyncState = {
  operation: { kind: 'idle' },
  sheetError: '',
  syncMessage: '',
}

export function settingsAsyncReducer(state: SettingsAsyncState, action: SettingsAsyncAction): SettingsAsyncState {
  switch (action.type) {
    case 'START':
      return { ...state, operation: { kind: action.operation }, sheetError: '' }
    case 'DONE':
      return { ...state, operation: { kind: 'idle' } }
    case 'FAIL':
      return { ...state, operation: { kind: 'idle' }, sheetError: action.message }
    case 'CLEAR_ERROR':
      return { ...state, sheetError: '' }
    default:
      return state
  }
}

export function settingsLoading(state: SettingsAsyncState): boolean {
  return state.operation.kind === 'loading_config'
}

export function settingsSaving(state: SettingsAsyncState): boolean {
  return state.operation.kind === 'saving'
}

export function settingsLoadingTabs(state: SettingsAsyncState): boolean {
  return state.operation.kind === 'loading_tabs'
}

export function settingsSyncing(state: SettingsAsyncState): boolean {
  return state.operation.kind === 'syncing_layout'
}
