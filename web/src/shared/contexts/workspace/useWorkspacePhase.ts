import { useReducer, type Dispatch } from 'react'
import {
  type PendingImportPayload,
  type WorkspacePhase,
  type WorkspacePhaseAction,
  workspacePhaseReducer,
} from './workspacePhase'

export function useWorkspacePhase() {
  return useReducer(workspacePhaseReducer, { kind: 'restoring' } satisfies WorkspacePhase)
}

export type WorkspacePhaseDispatch = Dispatch<WorkspacePhaseAction>

export type { PendingImportPayload, WorkspacePhase, WorkspacePhaseAction }
