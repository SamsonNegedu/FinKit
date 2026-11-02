import type { Transaction } from '@/shared/types'

export type TableInteraction =
  | { kind: 'idle' }
  | { kind: 'category_picker'; targetId: string }
  | { kind: 'split'; transaction: Transaction }
  | { kind: 'rename_merchant'; merchantKey: string }

export type TableInteractionAction =
  | { type: 'CLOSE' }
  | { type: 'OPEN_PICKER'; targetId: string }
  | { type: 'TOGGLE_PICKER'; targetId: string }
  | { type: 'START_SPLIT'; transaction: Transaction }
  | { type: 'START_RENAME'; merchantKey: string }

export function tableInteractionReducer(state: TableInteraction, action: TableInteractionAction): TableInteraction {
  switch (action.type) {
    case 'CLOSE':
      return { kind: 'idle' }
    case 'OPEN_PICKER':
      return { kind: 'category_picker', targetId: action.targetId }
    case 'TOGGLE_PICKER':
      if (state.kind === 'category_picker' && state.targetId === action.targetId) {
        return { kind: 'idle' }
      }

      return { kind: 'category_picker', targetId: action.targetId }
    case 'START_SPLIT':
      return { kind: 'split', transaction: action.transaction }
    case 'START_RENAME':
      return { kind: 'rename_merchant', merchantKey: action.merchantKey }
    default:
      return state
  }
}

export function pickerTargetId(interaction: TableInteraction): string | null {
  return interaction.kind === 'category_picker' ? interaction.targetId : null
}

export function splittingTransaction(interaction: TableInteraction): Transaction | null {
  return interaction.kind === 'split' ? interaction.transaction : null
}

export function renamingMerchantKey(interaction: TableInteraction): string | null {
  return interaction.kind === 'rename_merchant' ? interaction.merchantKey : null
}
