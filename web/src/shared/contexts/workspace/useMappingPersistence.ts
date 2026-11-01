import { useCallback } from 'react'
import { saveBatchLearnedMappings } from '@/features/settings/api/settings.api'
import type { MappingChange } from './types'

type ToastPush = (t: {
  message: string
  tone: 'success' | 'error'
  actionLabel?: string
  onAction?: () => void
}) => void

export function useMappingPersistence(
  pushToast: ToastPush,
  setPendingSaves: React.Dispatch<React.SetStateAction<number>>,
) {
  return useCallback(
    (changes: MappingChange[]) => {
      async function save(batch: MappingChange[]): Promise<void> {
        if (batch.length === 0) {
          return
        }
        setPendingSaves(n => n + 1)
        const ok = await saveBatchLearnedMappings(batch)

        setPendingSaves(n => n - 1)
        if (!ok) {
          pushToast({
            message: "Couldn't save this for future imports.",
            tone: 'error',
            actionLabel: 'Retry',
            onAction: () => save(batch),
          })
        }
      }

      return save(changes)
    },
    [pushToast, setPendingSaves],
  )
}
