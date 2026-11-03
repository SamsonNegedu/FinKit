import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, MoreHorizontal, Repeat } from 'lucide-react'
import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import CategoryIcon from '@/shared/components/CategoryIcon'
import type { BudgetRow, HistoryMonth } from '../utils/budgetProgress'
import BudgetBar from './BudgetBar'

/** The columns, shared with the list's heading so they line up: category, used, spent, limit, left, history, menu */
export const BUDGET_COLUMNS = 'sm:grid-cols-[11rem_minmax(7rem,1fr)_6rem_6.5rem_7.5rem_5.5rem_2rem]'

const ITEM =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none data-[highlighted]:bg-midnight-700'

/**
 * One budget on one line (three on a phone). Click the limit to change it. The rest (carry over, see transactions,
 * remove) is in one menu that is always there, so nothing hides until the pointer finds it.
 */
export default function BudgetRowCard({
  row,
  busy,
  onOpen,
  onChange,
  onRemove,
  onToggleRollover,
  history,
}: {
  row: BudgetRow
  busy: boolean
  onOpen: () => void
  onChange: (amount: number) => void
  onRemove: () => void
  onToggleRollover: () => void
  /** The months before this one, oldest first, as small dots */
  history?: HistoryMonth[]
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const n = Number((draft ?? '').replace(',', '.'))

    if (n > 0 && n !== row.base) {
      onChange(n)
    }
    setDraft(null)
  }
  const percent = `${Math.round(row.used * 100)}%`
  const barState = row.goal ? 'goal' : row.state
  const left =
    row.left >= 0
      ? { text: `${formatCurrency(row.left, row.currency)} ${row.goal ? 'to go' : 'left'}`, tone: 'text-midnight-300' }
      : row.goal
        ? { text: 'Goal reached', tone: 'text-cyan-400' }
        : { text: `${formatCurrency(-row.left, row.currency)} over`, tone: 'text-negative' }

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 text-sm ${BUDGET_COLUMNS}`}
    >
      <button
        className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 font-medium text-ink hover:underline"
        onClick={onOpen}
      >
        <CategoryIcon category={row.category} size="sm" />
        <span className="truncate">{row.category}</span>
        {row.rollover && !row.goal && (
          <Tooltip label="Unspent money carries into the next month">
            <Repeat className="h-3 w-3 shrink-0 text-accent" aria-label="Carries over" />
          </Tooltip>
        )}
      </button>
      <div className="col-span-2 row-start-2 flex items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <div className="min-w-0 flex-1">
          <BudgetBar
            used={row.used}
            state={barState}
            paceAt={row.paceAt}
            label={`${row.category} budget used`}
            limitLabel={`Limit ${formatCurrency(row.amount, row.currency)}`}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-midnight-300">{percent}</span>
      </div>
      <span className="col-start-1 row-start-3 flex items-center gap-1.5 whitespace-nowrap tabular-nums text-midnight-300 sm:contents">
        <span className="sm:col-start-3 sm:row-start-1 sm:text-right">{formatCurrency(row.spent, row.currency)}</span>
        <span className="sm:hidden" aria-hidden="true">
          of
        </span>
        <span className="sm:col-start-4 sm:row-start-1 sm:text-right">
          {draft === null ? (
            <Tooltip label="Click to change the limit">
              <button
                className="rounded px-1 text-ink underline decoration-midnight-500 decoration-dotted underline-offset-4 hover:bg-midnight-800"
                aria-label={`Change the ${row.category} limit, now ${formatCurrency(row.amount, row.currency)}`}
                onClick={() => setDraft(String(row.base))}
              >
                {formatCurrency(row.amount, row.currency)}
              </button>
            </Tooltip>
          ) : (
            <input
              autoFocus
              className="input w-24 py-0.5 text-right text-sm"
              inputMode="decimal"
              aria-label={`${row.category} limit`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  commit()
                } else if (e.key === 'Escape') {
                  setDraft(null)
                }
              }}
            />
          )}
        </span>
      </span>
      <span
        className={`col-start-2 row-start-3 text-right tabular-nums sm:col-start-5 sm:row-start-1 ${left.tone} ${row.state === 'watch' ? 'sm:!text-warning' : ''}`}
      >
        {left.text}
      </span>
      {history && <HistoryDots months={history} currency={row.currency} goal={row.goal} />}
      <div className="col-start-2 row-start-1 flex justify-end sm:col-start-7">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="rounded-md p-1.5 text-midnight-400 hover:bg-midnight-800 hover:text-ink"
              aria-label={`Options for the ${row.category} budget`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              collisionPadding={8}
              className="z-[80] w-64 rounded-xl border border-line-strong bg-midnight-800 p-1 shadow-2xl"
            >
              <DropdownMenu.Item className={ITEM} onSelect={onOpen}>
                <span className="w-4" />
                See transactions
              </DropdownMenu.Item>
              {!row.goal && (
                <DropdownMenu.CheckboxItem className={ITEM} checked={!!row.rollover} onSelect={onToggleRollover}>
                  <span className="w-4">
                    <DropdownMenu.ItemIndicator>
                      <Check className="h-4 w-4 text-accent" />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  Carry unspent money to next month
                </DropdownMenu.CheckboxItem>
              )}
              <DropdownMenu.Item className={`${ITEM} text-negative`} disabled={busy} onSelect={onRemove}>
                <span className="w-4" />
                Remove budget
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {row.carried > 0 && (
        <p className="col-span-full row-start-4 text-xs text-midnight-400 sm:col-start-1 sm:row-start-2">
          Includes {formatCurrency(row.carried, row.currency)} carried over from earlier months.
        </p>
      )}
      {!row.goal && row.projected !== null && row.projected > row.amount && row.state !== 'over' && (
        <p className="col-span-full row-start-4 text-xs text-warning sm:col-start-1 sm:row-start-2">
          At this pace you'll reach about {formatCurrency(row.projected, row.currency)} by month end.
        </p>
      )}
    </li>
  )
}

const DOT: Record<NonNullable<HistoryMonth['state']>, string> = {
  ok: 'bg-positive',
  watch: 'bg-warning',
  over: 'bg-negative',
  met: 'bg-cyan-500',
  short: 'bg-cyan-500/30',
}

/** What a dot says when hovered: the month, how it went, and the figures. */
function dotLabel(m: HistoryMonth, currency: string, goal: boolean): string {
  if (m.state === null) {
    return `${m.label}: nothing to compare`
  }
  const figures = `${formatCurrency(m.spent, currency)} of ${formatCurrency(m.limit, currency)}`
  const verdict = {
    ok: 'within the limit',
    watch: 'close to the limit',
    over: 'over the limit',
    met: 'goal reached',
    short: 'goal not reached',
  }[m.state]

  return `${m.label}: ${figures}, ${goal && m.state === 'short' ? 'goal not reached' : verdict}`
}

/** The last few months at a glance: which budgets keep going over. Hidden on a phone, where there is no room. */
function HistoryDots({ months, currency, goal }: { months: HistoryMonth[]; currency: string; goal: boolean }) {
  const bad = months.filter(m => m.state === 'over').length
  const summary = goal
    ? `${months.filter(m => m.state === 'met').length} of the last ${months.length} months reached`
    : `${bad} of the last ${months.length} months over`

  return (
    <span
      className="hidden items-center justify-end gap-1 sm:col-start-6 sm:row-start-1 sm:flex"
      role="img"
      aria-label={summary}
    >
      {months.map(m => (
        <Tooltip key={m.label} label={dotLabel(m, currency, goal)}>
          <span
            className={`h-2.5 w-2.5 rounded-full ${m.state ? DOT[m.state] : 'border border-line-strong'}`}
            aria-hidden="true"
          />
        </Tooltip>
      ))}
    </span>
  )
}
