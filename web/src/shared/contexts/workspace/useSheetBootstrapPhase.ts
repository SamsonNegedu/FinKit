import { useReducer, type Dispatch } from 'react'
import { type SheetBootstrapAction, type SheetBootstrapPhase, sheetBootstrapReducer } from './workspacePhase'

export function useSheetBootstrapPhase() {
  return useReducer(sheetBootstrapReducer, { kind: 'idle' } satisfies SheetBootstrapPhase)
}

export type SheetBootstrapDispatch = Dispatch<SheetBootstrapAction>

export type { SheetBootstrapAction, SheetBootstrapPhase }
