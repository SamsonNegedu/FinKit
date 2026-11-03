import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useQuery } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react'
import CategoryIcon from '@/shared/components/CategoryIcon'
import { COLOR_CHOICES } from '@/shared/components/categoryIconSet'
import Tooltip from '@/shared/components/Tooltip'
import { useApp } from '@/shared/contexts/AppState'
import ConfirmDialog from '@/shared/components/forms/ConfirmDialog'
import { useBudgets } from '@/features/budgets/hooks/budgets-queries'
import StyleBadge from '@/shared/components/StyleBadge'
import { RESERVED_CATEGORIES, getCategoryColor, getCategoryStyle, type CategoryStyle } from '@/shared/utils/categorizer'
import { newCategoryProblem, type CategoryList } from '@/shared/utils/categorizer/categoryList'
import { categoryUse, isUnused, otherUse } from '@/shared/utils/categorizer/categoryUse'
import { getLearnedMappings } from '../api/settings.api'
import { getTransactionRules } from '../api/transactionRules.api'
import { useSaveCategories } from '../hooks/category-queries'

/** Categories that cannot be archived: transactions that match nothing are filed here. */
const KEEP = 'Other'

const iconButton =
  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-midnight-300 hover:bg-midnight-700 hover:text-white disabled:opacity-40'

const IconPicker = lazy(() => import('./IconPicker'))

/** Any color, typed as a hex code, for when none of the swatches is the one you want. */
function HexField({ color, onPick }: { color: string; onPick: (hex: string) => void }) {
  const [text, setText] = useState('')
  const valid = /^#[0-9a-fA-F]{6}$/.test(text)

  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className="h-6 w-6 shrink-0 rounded-full"
        style={{ backgroundColor: valid ? text : color }}
        aria-hidden="true"
      />
      <input
        className="input w-28 !py-1 text-sm"
        placeholder="#a855f7"
        aria-label="Hex color"
        maxLength={7}
        value={text}
        onChange={e => {
          const next = e.target.value.startsWith('#') || !e.target.value ? e.target.value : `#${e.target.value}`

          setText(next)
          if (/^#[0-9a-fA-F]{6}$/.test(next)) {
            onPick(next.toLowerCase())
          }
        }}
      />
      {text && !valid && <span className="text-xs text-midnight-400">6 digits, like #a855f7</span>}
    </div>
  )
}

/** The icon and color of a category, changed from its badge. Resetting goes back to what it had by default. */
function StylePicker({
  label,
  style,
  color,
  badge,
  disabled = false,
  onChange,
}: {
  label: string
  /** What it has been given; none while it still has its defaults */
  style: CategoryStyle | undefined
  /** The color it shows now, chosen or default */
  color: string
  badge: ReactNode
  disabled?: boolean
  onChange: (change: CategoryStyle | null) => void
}) {
  return (
    <Popover.Root>
      <Tooltip label="Change icon and color">
        <Popover.Trigger asChild>
          <button
            disabled={disabled}
            aria-label={label}
            className="rounded-lg p-0.5 hover:bg-midnight-700 disabled:opacity-50"
          >
            {badge}
          </button>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-[80] w-80 space-y-3 rounded-xl border border-midnight-600 bg-midnight-800 p-3 shadow-2xl"
        >
          <div>
            <p className="mb-1.5 text-xs text-midnight-400">Icon</p>
            <Suspense fallback={<p className="py-6 text-center text-xs text-midnight-400">Loading icons…</p>}>
              <IconPicker value={style?.icon} color={color} onPick={icon => onChange({ icon })} />
            </Suspense>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-midnight-400">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_CHOICES.map(c => (
                <button
                  key={c}
                  aria-label={c}
                  aria-pressed={style?.color === c}
                  onClick={() => onChange({ color: c })}
                  className={`h-6 w-6 rounded-full ${style?.color === c ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <HexField color={color} onPick={c => onChange({ color: c })} />
          </div>
          {style && (
            <button className="text-xs text-midnight-400 underline hover:text-white" onClick={() => onChange(null)}>
              Back to the default
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

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
  // The icon and color chosen for the category being typed, before it exists
  const [draft, setDraft] = useState<CategoryStyle | null>(null)
  const list = app.categoryList
  const counts = useMemo(() => {
    const out = new Map<string, number>()

    for (const t of app.transactions) {
      out.set(t.category || 'Other', (out.get(t.category || 'Other') ?? 0) + 1)
    }

    return out
  }, [app.transactions])

  // What else points at a category. Until all of it is known nothing can be deleted, since an unknown use is not "none"
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
        // An archived one keeps the look it had; a new one gets what was picked, if anything
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
  const row = (c: string, action: React.ReactNode) => {
    const use = usageOf(c)
    const other = otherUse(use)
    const canDelete = known && c !== KEEP && isUnused(use)

    return (
      <li key={c} className="flex items-center gap-3 border-t border-midnight-800 py-2 first:border-t-0">
        <StylePicker
          label={`Change icon and color of ${c}`}
          style={getCategoryStyle(c)}
          color={getCategoryColor(c)}
          badge={<CategoryIcon category={c} size="sm" />}
          disabled={save.isPending}
          onChange={change => restyle(c, change)}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-white">{c}</span>
          {other && <span className="block truncate text-xs text-midnight-500">{other}</span>}
        </span>
        <span className="text-xs tabular-nums text-midnight-500">
          {use.transactions} transaction{use.transactions === 1 ? '' : 's'}
        </span>
        {action}
        {canDelete && (
          <Tooltip label="Nothing uses it, so it can be deleted">
            <button
              className={iconButton}
              disabled={save.isPending}
              aria-label={`Delete ${c}`}
              onClick={() => setDeleting(c)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </li>
    )
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Categories</h2>
        <p className="mt-0.5 text-sm text-midnight-400">
          Archive one you no longer use. It stops being offered when you categorise, but stays in filters, charts and
          past years. One that nothing uses can be deleted. A new category has no column in your sheet until you map it
          under Columns.
        </p>
      </div>
      <div>
        <div className="flex gap-2">
          <div className="input flex shrink-0 items-center !px-2">
            <StylePicker
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
