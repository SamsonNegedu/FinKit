import { useReducer } from 'react'
import {
  fileUploadUiReducer,
  type FileUploadUiPhase,
  type FileUploadUiAction,
  showFileDropZone,
  showOptionsModal,
} from './fileUploadPhase'

export function useFileUploadUi(bankingEnabled: boolean) {
  const [phase, dispatch] = useReducer(fileUploadUiReducer, {
    kind: 'pick',
    revealFileDrop: !bankingEnabled,
  } satisfies FileUploadUiPhase)

  return {
    phase,
    dispatch,
    showOptionsModal: () => showOptionsModal(phase),
    showFileDropZone: () => showFileDropZone(phase, !!bankingEnabled),
    optionsFile: phase.kind === 'options' ? phase.file : null,
    dateFilter: phase.kind === 'options' ? phase.dateFilter : ('3m' as const),
  }
}

export type { FileUploadUiAction, FileUploadUiPhase }
