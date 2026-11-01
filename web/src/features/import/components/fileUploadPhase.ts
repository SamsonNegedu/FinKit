import type { ImportOptions } from '@/features/import/components/fileUpload.types'

export type FileUploadUiPhase =
  | { kind: 'pick'; revealFileDrop: boolean }
  | { kind: 'options'; file: File; dateFilter: ImportOptions['dateFilter'] }

export type FileUploadUiAction =
  | { type: 'TOGGLE_FILE_DROP' }
  | { type: 'FILE_SELECTED'; file: File }
  | { type: 'SET_DATE_FILTER'; dateFilter: ImportOptions['dateFilter'] }
  | { type: 'CANCEL_OPTIONS' }
  | { type: 'CONFIRM_OPTIONS' }
  | { type: 'RESET'; bankingEnabled: boolean }

export function fileUploadUiReducer(phase: FileUploadUiPhase, action: FileUploadUiAction): FileUploadUiPhase {
  switch (action.type) {
    case 'TOGGLE_FILE_DROP':
      if (phase.kind !== 'pick') {
        return phase
      }

      return { ...phase, revealFileDrop: !phase.revealFileDrop }
    case 'FILE_SELECTED':
      return { kind: 'options', file: action.file, dateFilter: '3m' }
    case 'SET_DATE_FILTER':
      if (phase.kind !== 'options') {
        return phase
      }

      return { ...phase, dateFilter: action.dateFilter }
    case 'CANCEL_OPTIONS':
      return { kind: 'pick', revealFileDrop: true }
    case 'CONFIRM_OPTIONS':
      return { kind: 'pick', revealFileDrop: true }
    case 'RESET':
      return { kind: 'pick', revealFileDrop: !action.bankingEnabled }
    default:
      return phase
  }
}

export function showOptionsModal(phase: FileUploadUiPhase): phase is Extract<FileUploadUiPhase, { kind: 'options' }> {
  return phase.kind === 'options'
}

export function showFileDropZone(phase: FileUploadUiPhase, bankingEnabled: boolean): boolean {
  return !bankingEnabled || (phase.kind === 'pick' && phase.revealFileDrop)
}
