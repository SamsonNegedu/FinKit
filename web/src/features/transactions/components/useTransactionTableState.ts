import { useState, useRef, useEffect, useMemo, useCallback, useReducer } from 'react'
import { Transaction } from '@/shared/types'
import { getAvailableCategories, merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'
import { parseLocalDate } from '@/shared/utils/dates'
import type { MerchantGroup, SortDirection, SortField } from './transactionTableTypes'
import {
  pickerPosition,
  pickerTargetId,
  renamingMerchantKey,
  splittingTransaction,
  tableInteractionReducer,
  type TableInteractionAction,
} from './tableInteraction'

const PAGE = 200

export function useTransactionTableState(
  transactions: Transaction[],
  selectedIds: Set<string>,
  onSelectionChange: (ids: Set<string>) => void,
  controlledViewMode?: 'list' | 'merchant',
  onViewModeChange?: (mode: 'list' | 'merchant') => void,
) {
  const [interaction, dispatchInteraction] = useReducer(tableInteractionReducer, { kind: 'idle' })
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [categorySearch, setCategorySearch] = useState('')
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const editingId = pickerTargetId(interaction)
  const pickerPos = pickerPosition(interaction)
  const splitting = splittingTransaction(interaction)
  const renamingKey = renamingMerchantKey(interaction)

  const closePicker = useCallback(() => {
    dispatchInteraction({ type: 'CLOSE' })
    setCategorySearch('')
    setActiveIndex(0)
  }, [])

  const openPicker = (id: string, trigger: HTMLElement) => {
    const r = trigger.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 220 - 8))
    const flip = r.bottom + 310 > window.innerHeight && r.top > 310
    const position = flip ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 }

    dispatchInteraction({ type: 'TOGGLE_PICKER', targetId: id, position })
    setActiveIndex(0)
  }

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
    if (!editingId) {
      return
    }
    const close = (e: Event) => {
      if (e.type === 'scroll' && dropdownRef.current?.contains(e.target as Node)) {
        return
      }
      closePicker()
    }

    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [editingId, closePicker])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closePicker()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closePicker])

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

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)

    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  const filteredCategories = getAvailableCategories().filter(c =>
    c.toLowerCase().includes(categorySearch.toLowerCase()),
  )

  const groups = useMemo(() => {
    const result: MerchantGroup[] = []

    for (const tx of sortedTransactions) {
      const key = merchantKeyOf(tx)
      const group = result.find(g => sameMerchant(g.key, key))
      const signed = tx.isExcluded ? 0 : tx.type === 'income' ? tx.amount : -tx.amount

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
    categorySearch,
    setCategorySearch,
    limit,
    setLimit,
    activeIndex,
    setActiveIndex,
    viewMode,
    setViewMode,
    collapsed,
    setCollapsed,
    dropdownRef,
    pickerPos,
    splitting,
    setSplitting,
    renamingKey,
    setRenamingKey,
    openPicker,
    closePicker,
    sortedTransactions,
    handleSort,
    handleToggleSelect,
    filteredCategories,
    groups,
    visibleGroups,
    shownRows,
    hasMore,
  }
}

export type { TableInteractionAction }
