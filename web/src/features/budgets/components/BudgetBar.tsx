import Tooltip from '@/shared/components/Tooltip'

type State = 'ok' | 'watch' | 'over' | 'goal'

const FILL: Record<State, string> = {
  ok: 'bg-emerald-500',
  watch: 'bg-amber-500',
  // The part of an overspent bar that is still inside the limit: full, but calm, so the overshoot is what stands out
  over: 'bg-rose-900',
  // A target to reach, not a limit: it only fills up
  goal: 'bg-cyan-500',
}

// Diagonal stripes on the overshoot, so it reads as "past the limit" without relying on the color alone
const STRIPES =
  'repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 4px, transparent 4px 8px), linear-gradient(#f43f5e, #f43f5e)'

/**
 * Progress to the limit. Past it, the bar rescales: the limit becomes a tick that stands out of the bar, the overshoot
 * is a striped red stretch, and the amount over is written just before the tick.
 */
export default function BudgetBar({
  used: usedRaw,
  state,
  paceAt,
  label,
  overLabel,
  limitLabel,
  thick = false,
  paceLabel,
}: {
  used: number
  state: State
  /** How far through the month today is (0-1); null when the month is over */
  paceAt: number | null
  label: string
  /** Said just before the limit tick, e.g. "+€1,234"; for wide bars, where the amount is not said beside them */
  overLabel?: string
  /** Said when hovering the limit tick, e.g. "Limit €90.00" */
  limitLabel?: string
  /** A taller bar, for the one that headlines a card */
  thick?: boolean
  /** Names the today marker under the bar, e.g. "Today"; for the headline bar, where the marker would not be understood */
  paceLabel?: string
}) {
  const used = state === 'goal' ? Math.min(usedRaw, 1) : usedRaw
  const scale = Math.max(1, used)
  const within = (Math.min(1, used) / scale) * 100
  const limitAt = (1 / scale) * 100
  const over = used > 1
  // The amount over is written in one place, against the limit tick on the part inside the limit. It is left off when
  // that part is too short to hold it. List rows leave it off altogether: their "Left" column already says it.

  const showPaceLabel = paceLabel && paceAt !== null

  return (
    <div className={`relative ${showPaceLabel ? 'pb-5' : ''}`}>
      <div
        className={`relative overflow-hidden rounded-full bg-midnight-800 ${over || thick ? 'h-4' : 'h-2'}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(used * 100)}
      >
        <div className={`absolute inset-y-0 left-0 ${FILL[state]}`} style={{ width: `${within}%` }} />
        {over && <div className="absolute inset-y-0" style={{ left: `${limitAt}%`, right: 0, background: STRIPES }} />}
        {over && overLabel && limitAt >= 15 && (
          <span
            className="absolute inset-y-0 flex items-center pr-2 text-[10px] font-semibold tabular-nums text-white"
            style={{ right: `calc(${100 - limitAt}% + 3px)` }}
          >
            {overLabel}
          </span>
        )}
        {paceAt !== null && (
          <Tooltip label="Where you'd be today if spending were even through the month">
            <div className="absolute inset-y-0 w-px bg-midnight-300" style={{ left: `${paceAt * limitAt}%` }} />
          </Tooltip>
        )}
        {over && (
          <Tooltip label={limitLabel ?? 'The limit'}>
            <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-white" style={{ left: `${limitAt}%` }} />
          </Tooltip>
        )}
      </div>
      {showPaceLabel && (
        <span
          className="absolute top-full -mt-4 -translate-x-1/2 whitespace-nowrap text-[10px] text-midnight-400"
          style={{ left: `${paceAt * limitAt}%` }}
        >
          {paceLabel}
        </span>
      )}
    </div>
  )
}
