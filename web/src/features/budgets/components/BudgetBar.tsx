import Tooltip from '@/shared/components/Tooltip'
type State = 'ok' | 'watch' | 'over'

const FILL: Record<State, string> = { ok: 'bg-emerald-500', watch: 'bg-amber-500', over: 'bg-rose-500/50' }

/** Progress to the limit. Past it, the bar rescales so the limit becomes a tick and the overshoot shows its size. */
export default function BudgetBar({
  used,
  state,
  paceAt,
  label,
}: {
  used: number
  state: State
  /** How far through the month today is (0-1); null when the month is over */
  paceAt: number | null
  label: string
}) {
  const scale = Math.max(1, used)
  const within = (Math.min(1, used) / scale) * 100
  const limitAt = (1 / scale) * 100

  return (
    <div
      className="relative h-1.5 overflow-hidden rounded-full bg-midnight-800"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(used * 100)}
    >
      <div className={`absolute inset-y-0 left-0 ${FILL[state]}`} style={{ width: `${within}%` }} />
      {paceAt !== null && (
        <Tooltip label="Where you'd be today if spending were even through the month">
          <div className="absolute inset-y-0 w-px bg-midnight-300" style={{ left: `${paceAt * limitAt}%` }} />
        </Tooltip>
      )}
      {used > 1 && (
        <>
          <div className="absolute inset-y-0 bg-rose-500" style={{ left: `${limitAt}%`, right: 0 }} />
          <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${limitAt}%` }} />
        </>
      )}
    </div>
  )
}
