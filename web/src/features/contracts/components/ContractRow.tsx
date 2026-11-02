import Tooltip from '@/shared/components/Tooltip'
import { ChevronRight, Check } from 'lucide-react'
import { formatCurrency } from '@/shared/utils/format'
import type { Contract } from '../api/contracts.api'
import { getCategoryColor } from '@/shared/utils/categorizer/categoryMeta'
import { FREQUENCY_LABEL } from '../utils/contractGroups'

interface Props {
  contract: Contract
  /** The dearest contract in view: every row's bar is drawn against it */
  max: number
  onOpen: () => void
}

const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function subtitle(c: Contract) {
  const every = c.frequency === 'monthly' ? 'Monthly' : c.frequency === 'quarterly' ? 'Quarterly' : 'Yearly'

  if (!c.active && c.lastDate) {
    return `Ended · last paid ${shortDate(c.lastDate)}`
  }
  const next = c.nextExpected ? ` · next ${shortDate(c.nextExpected)}` : ''
  const km = c.costPerKm !== null ? ` · ${formatCurrency(c.costPerKm, c.currency)}/km` : ''

  return `${every}${next}${km}`
}

/** One contract as a quiet line: a tile, its name, how big it is next to the others, and what it costs. */
export default function ContractRow({ contract: c, max, onOpen }: Props) {
  const color = getCategoryColor(c.group)
  const rise = c.priceChange ? c.priceChange.to - c.priceChange.from : 0

  return (
    <li>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-midnight-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {c.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-2 ${c.active ? 'text-white' : 'text-midnight-400'}`}>
            <span className="truncate text-sm font-medium">{c.name}</span>
            {c.state === 'confirmed' && <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Confirmed" />}
            {c.kind === 'variable' && (
              <span className="shrink-0 rounded-full bg-midnight-700 px-2 py-0.5 text-[11px] text-midnight-300">
                varies
              </span>
            )}
            {c.priceChange && (
              <Tooltip
                label={`${formatCurrency(c.priceChange.from, c.currency)} → ${formatCurrency(c.priceChange.to, c.currency)}`}
              >
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                    rise > 0 ? 'bg-amber-400/15 text-amber-300' : 'bg-accent/15 text-accent'
                  }`}
                >
                  {rise > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(rise), c.currency)}
                </span>
              </Tooltip>
            )}
          </span>
          <span className="block truncate text-xs text-midnight-400">{subtitle(c)}</span>
        </span>
        <span aria-hidden className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-midnight-800 sm:block">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.max(4, (c.monthly / max) * 100)}%`,
              backgroundColor: color,
              opacity: c.active ? 1 : 0.4,
            }}
          />
        </span>
        <span className="shrink-0 whitespace-nowrap text-right sm:min-w-36">
          <span className={`block text-sm font-medium tabular-nums ${c.active ? 'text-white' : 'text-midnight-400'}`}>
            {formatCurrency(c.amount, c.currency)}
          </span>
          <span className="block text-xs text-midnight-500">
            {c.frequency === 'monthly'
              ? 'per month'
              : `per ${FREQUENCY_LABEL[c.frequency]} · ${formatCurrency(c.monthly, c.currency)}/mo`}
          </span>
        </span>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-midnight-600 transition-colors group-hover:text-midnight-300 sm:block" />
      </button>
    </li>
  )
}
