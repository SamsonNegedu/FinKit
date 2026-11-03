import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Plus } from 'lucide-react'
import Tooltip from '@/shared/components/Tooltip'
import { useApp } from '@/shared/contexts/AppState'
import ConfirmDialog from '@/shared/components/forms/ConfirmDialog'
import { useBudgets } from '@/features/budgets/hooks/budgets-queries'
import StyleBadge from '@/shared/components/StyleBadge'
import { RESERVED_CATEGORIES, getCategoryColor, type CategoryStyle } from '@/shared/utils/categorizer'
import { newCategoryProblem, type CategoryList } from '@/shared/utils/categorizer/categoryList'
import { categoryUse } from '@/shared/utils/categorizer/categoryUse'
import { getLearnedMappings } from '../api/settings.api'
import { getTransactionRules } from '../api/transactionRules.api'
import { useSaveCategories } from '../hooks/category-queries'
import CategoryListRow from './CategoryListRow'
import CategoryStylePicker from './CategoryStylePicker'

/** Categories that cannot be archived: transactions that match nothing are filed here. */
const KEEP = 'Other'

const iconButton =
  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-midnight-300 hover:bg-midnight-700 hover:text-ink disabled:opacity-40'

/**
 * Add a category, or archive one you no longer use. An archived category is not offered when you categorise, but
 * every transaction keeps it, and it stays in filters, charts and past years, so nothing you learned from a year
 * is lost when your categories change.
 */
export default function CategoriesPanel() {
  const app = useApp()
  const save = useSaveCategories()
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [draft, setDraft] = useState<CategoryStyle | null>(null)
  const list = app.categoryList
  const counts = useMemo(() => {
    const out = new Map<string, number>()

    for (const t of app.transactions) {
      out.set(t.category || 'Other', (out.get(t.category || 'Other') ?? 0) + 1)
    }

    return out
  }, [app.transactions])

  const budgets = useBudgets()
  const rules = useQuery({ queryKey: ['settings', 'transaction-rules'], queryFn: getTransactionRules })
  const learned = useQuery({ queryKey: ['settings', 'learned-mappings'], queryFn: getLearnedMappings })
  const known = !budgets.isLoading && !rules.isLoading && !learned.isLoading
  const usageOf = (c: string) =>
    categoryUse(c, {
      transactions: counts,
      budgets: (budgets.data?.budgets ?? []).map(b => b.category),
      rules: [...(rules.data ?? []).map(r => r.category), ...(learned.data ?? []).map(m => m.category)],
      columns: (app.sheetConfig?.categoryMappings ?? []).map(m => m.appCategory),
    })
  const [deleting, setDeleting] = useState<string | null>(null)
  const remove = (c: string) => {
    const { [c]: _gone, ...style } = list.style ?? {}

    apply(
      { active: list.active.filter(x => x !== c), archived: list.archived.filter(x => x !== c), style },
      `${c} deleted`,
    )
    setDeleting(null)
  }
  const apply = (next: CategoryList, message?: string) =>
    save.mutate(next, { onSuccess: () => message && app.pushToast({ message, tone: 'success' }) })
  const restyle = (c: string, change: { icon?: string; color?: string } | null) => {
    const { [c]: _old, ...rest } = list.style ?? {}

    apply({ ...list, style: change ? { ...rest, [c]: { ..._old, ...change } } : rest })
  }
  const add = () => {
    const clean = name.trim()
    const found = newCategoryProblem(clean, list, RESERVED_CATEGORIES)

    setProblem(found)
    if (found) {
      return
    }
    const wasArchived = list.archived.find(c => c.toLowerCase() === clean.toLowerCase())

    apply(
      {
        ...list,
        active: [...list.active, wasArchived ?? clean],
        archived: list.archived.filter(c => c !== wasArchived),
        style: draft && !wasArchived ? { ...list.style, [clean]: draft } : list.style,
      },
      wasArchived ? `${wasArchived} restored` : `${clean} added`,
    )
    setName('')
    setDraft(null)
  }
  const archive = (c: string) =>
    apply({ ...list, active: list.active.filter(x => x !== c), archived: [...list.archived, c] }, `${c} archived`)
  const restore = (c: string) =>
    apply({ ...list, active: [...list.active, c], archived: list.archived.filter(x => x !== c) }, `${c} restored`)

  const row = (c: string, action: ReactNode) => (
    <CategoryListRow
      key={c}
      category={c}
      action={action}
      use={usageOf(c)}
      known={known}
      keepName={KEEP}
      pending={save.isPending}
      onRestyle={change => restyle(c, change)}
      onDeleteRequest={() => setDeleting(c)}
    />
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Categories</h2>
        <p className="mt-0.5 text-sm text-midnight-400">
          Archive one you no longer use. It stops being offered when you categorise, but stays in filters, charts and
          past years. One that nothing uses can be deleted. A new category has no column in your sheet until you map it
          under Columns.
        </p>
      </div>
      <div>
        <div className="flex gap-2">
          <div className="input flex shrink-0 items-center !px-2">
            <CategoryStylePicker
              label="Choose an icon and color for the new category"
              style={draft ?? undefined}
              color={draft?.color ?? getCategoryColor(name.trim() || 'New')}
              badge={<StyleBadge icon={draft?.icon} color={draft?.color ?? getCategoryColor(name.trim() || 'New')} />}
              onChange={change => setDraft(change ? { ...draft, ...change } : null)}
            />
          </div>
          <input
            className="input min-w-0 flex-1"
            value={name}
            maxLength={40}
            placeholder="New category"
            aria-label="New category"
            onChange={e => {
              setName(e.target.value)
              setProblem(null)
            }}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button
            className="btn-primary flex items-center gap-2"
            disabled={!name.trim() || save.isPending}
            onClick={add}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {problem && <p className="mt-1 text-sm text-expense">{problem}</p>}
        {save.error && <p className="mt-1 text-sm text-expense">{save.error.message}</p>}
      </div>
      <ul>
        {list.active.map(c =>
          row(
            c,
            <Tooltip label={c === KEEP ? 'Unmatched transactions are filed here' : `Archive ${c}`}>
              <button
                className={iconButton}
                disabled={c === KEEP || save.isPending}
                aria-label={`Archive ${c}`}
                onClick={() => archive(c)}
              >
                <Archive className="h-4 w-4" /> Archive
              </button>
            </Tooltip>,
          ),
        )}
      </ul>
      {list.archived.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-midnight-400">Archived</h3>
          <ul className="mt-1">
            {list.archived.map(c =>
              row(
                c,
                <button
                  className={iconButton}
                  disabled={save.isPending}
                  aria-label={`Restore ${c}`}
                  onClick={() => restore(c)}
                >
                  <ArchiveRestore className="h-4 w-4" /> Restore
                </button>,
              ),
            )}
          </ul>
        </section>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting}?`}
          description="No transaction, budget, rule or sheet column uses it. It goes from your list, with its icon and color. You can add it again later."
          confirmLabel="Delete"
          busy={save.isPending}
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
