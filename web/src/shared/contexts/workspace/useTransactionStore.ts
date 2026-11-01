import { useCallback, useRef, useState } from 'react'
import type { Transaction } from '@/shared/types'
import type { RawTransaction } from '@/shared/types'
import type { SplitMap } from '@/shared/utils/splits'
import { syncSplits } from '@/shared/utils/splits'

export function useTransactionStore() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const transactionsRef = useRef<Transaction[]>([])
  const rawTransactionsRef = useRef<RawTransaction[]>([])
  const splitsRef = useRef<SplitMap>({})

  const commit = useCallback((next: Transaction[]) => {
    transactionsRef.current = next
    splitsRef.current = syncSplits(splitsRef.current, next)
    setTransactions(next)
  }, [])

  const replaceRaw = useCallback((next: RawTransaction[]) => {
    rawTransactionsRef.current = next
  }, [])

  const replaceSplits = useCallback((next: SplitMap) => {
    splitsRef.current = next
  }, [])

  return {
    transactions,
    transactionsRef,
    rawTransactionsRef,
    splitsRef,
    commit,
    replaceRaw,
    replaceSplits,
    setTransactions,
  }
}

export type TransactionStore = ReturnType<typeof useTransactionStore>
