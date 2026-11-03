import { useState, useRef, useEffect, useMemo, useCallback, useReducer } from 'react'
import { Transaction } from '@/shared/types'
import { signedTransactionAmount } from '@/shared/utils/transactionAmount'
import { getAvailableCategories, merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'
import { parseLocalDate } from '@/shared/utils/dates'
import type { MerchantGroup, SortDirection, SortField } from './transactionTableTypes'
import {
  pickerTargetId,
  renamingMerchantKey,
  splittingTransaction,
  tableInteractionReducer,
  type TableInteractionAction,
} from './tableInteraction'

const PAGE = 100

export function useTransactionTableState(
  transactions: Transaction[],
  selectedIds: Set<string>,
  onSelectionChange: (ids: Set<string>) => void,
  controlledViewMode?: 'list' | 'merchant',
  onViewModeChange?: (mode: 'list' | 'merchant') => void,
  categories: string[] = getAvailableCategories(),
) {
  const [interaction, dispatchInteraction] = useReducer(tableInteractionReducer, { kind: 'idle' })
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'merchant'>('list')
  const viewMode = controlledViewMode ?? internalViewMode
  const setViewMode = (mode: 'list' | 'merchant') => (onViewModeChange ?? setInternalViewMode)(mode)
  const limitKey = `${transactions.length}:${sortField}:${sortDirection}:${viewMode}`
  const [limitState, setLimitState] = useState({ key: limitKey, limit: PAGE })

  if (limitState.key !== limitKey) {
    setLimitState({ key: limitKey, limit: PAGE })
  }

  const limit = limitState.limit
  const setLimit = (next: number | ((prev: number) => number)) => {
    setLimitState(prev => ({
      key: limitKey,
      limit: typeof next === 'function' ? next(prev.limit) : next,
    }))
  }
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const editingId = pickerTargetId(interaction)
  const splitting = splittingTransaction(interaction)
  const renamingKey = renamingMerchantKey(interaction)

  const closePicker = useCallback(() => {
    dispatchInteraction({ type: 'CLOSE' })
  }, [])

  const openPicker = (id: string) => dispatchInteraction({ type: 'TOGGLE_PICKER', targetId: id })

  const setSplitting = (tx: Transaction | null) => {
    if (tx) {
      dispatchInteraction({ type: 'START_SPLIT', transaction: tx })
    } else {
      dispatchInteraction({ type: 'CLOSE' })
    }
  }

  const setRenamingKey = (key: string | null) => {
    if (key) {
      dispatchInteraction({ type: 'START_RENAME', merchantKey: key })
    } else {
      dispatchInteraction({ type: 'CLOSE' })
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (interaction.kind !== 'idle') {
          dispatchInteraction({ type: 'CLOSE' })
        }
        closePicker()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closePicker, interaction.kind])

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        let comparison = 0

        switch (sortField) {
          case 'date':
            comparison = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
            break
          case 'amount':
            comparison = a.amount - b.amount
            break
          case 'category':
            comparison = (a.category || '').localeCompare(b.category || '')
            break
          case 'description':
            comparison = a.description.localeCompare(b.description)
            break
        }

        return sortDirection === 'asc' ? comparison : -comparison
      }),
    [transactions, sortField, sortDirection],
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Shift-click picks everything between the last row you clicked and this one, in the order shown
  const lastClicked = useRef<string | null>(null)
  // Tracked on the window: a checkbox's change event does not say whether Shift was held
  const shiftHeld = useRef(false)
  // Touch screens have no Shift key: "Select range" in the bulk bar makes the next tap count as a Shift-click
  const [rangeArmed, setRangeArmed] = useState(false)

  useEffect(() => {
    const track = (e: KeyboardEvent) => {
      shiftHeld.current = e.shiftKey
    }
    const release = () => {
      shiftHeld.current = false
    }

    window.addEventListener('keydown', track)
    window.addEventListener('keyup', track)
    window.addEventListener('blur', release)

    return () => {
      window.removeEventListener('keydown', track)
      window.removeEventListener('keyup', track)
      window.removeEventListener('blur', release)
    }
  }, [])
  const handleToggleSelect = (id: string, shift = shiftHeld.current || rangeArmed) => {
    setRangeArmed(false)
    const newSelected = new Set(selectedIds)
    const selecting = !newSelected.has(id)
    const from = sortedTransactions.findIndex(t => t.id === lastClicked.current)
    const to = sortedTransactions.findIndex(t => t.id === id)
    const ids =
      shift && viewMode === 'list' && from >= 0 && to >= 0
        ? sortedTransactions.slice(Math.min(from, to), Math.max(from, to) + 1).map(t => t.id)
        : [id]

    for (const x of ids) {
      if (selecting) {
        newSelected.add(x)
      } else {
        newSelected.delete(x)
      }
    }
    lastClicked.current = id
    onSelectionChange(newSelected)
  }

  const groups = useMemo(() => {
    const result: MerchantGroup[] = []

    for (const tx of sortedTransactions) {
      const key = merchantKeyOf(tx)
      const group = result.find(g => sameMerchant(g.key, key))
      const signed = signedTransactionAmount(tx)

      if (group) {
        group.items.push(tx)
        group.total += signed
        group.categories.add(tx.category || 'Other')
      } else {
        result.push({ key, items: [tx], total: signed, categories: new Set([tx.category || 'Other']) })
      }
    }

    return result.sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key))
  }, [sortedTransactions])

  const visibleGroups = useMemo(() => {
    let rows = 0
    const out: MerchantGroup[] = []

    for (const g of groups) {
      if (rows >= limit) {
        break
      }
      out.push(g)
      rows += g.items.length + 1
    }

    return out
  }, [groups, limit])

  const shownRows =
    viewMode === 'list'
      ? Math.min(limit, sortedTransactions.length)
      : visibleGroups.reduce((n, g) => n + g.items.length, 0)
  const hasMore = viewMode === 'list' ? limit < sortedTransactions.length : visibleGroups.length < groups.length

  return {
    PAGE,
    interaction,
    editingId,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    limit,
    setLimit,
    viewMode,
    setViewMode,
    collapsed,
    setCollapsed,
    splitting,
    setSplitting,
    renamingKey,
    setRenamingKey,
    openPicker,
    closePicker,
    sortedTransactions,
    handleSort,
    handleToggleSelect,
    rangeArmed,
    armRange: () => setRangeArmed(true),
    categories,
    groups,
    visibleGroups,
    shownRows,
    hasMore,
  }
}

export type { TableInteractionAction }
