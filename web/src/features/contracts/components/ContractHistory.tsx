import { useState } from 'react'
import { formatCurrency } from '@/shared/utils/format'
import type { ContractPayment } from '../api/contracts.api'

interface Props {
  /** Newest first, as the server sends them */
  payments: ContractPayment[]
  currency: string
  color: string
}

const W = 560
const H = 120
const PAD = { left: 8, right: 12, top: 14, bottom: 22 }
const t = (d: string) => new Date(`${d}T00:00:00Z`).getTime()
const niceDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
const SHOWN = 6

/** What was paid and when, as a price line that holds until the next payment, with the payments listed under it. */
export default function ContractHistory({ payments, currency, color }: Props) {
  const [all, setAll] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const points = payments.map((_, i) => payments[payments.length - 1 - i]) // oldest first for drawing

  if (points.length === 0) {
    return null
  }
  const last = points[points.length - 1]
  const lo = Math.min(...points.map(p => p.amount))
  const hi = Math.max(...points.map(p => p.amount))
  const span = hi - lo || hi * 0.2 || 1
  const x0 = t(points[0].date)
  const x1 = t(last.date)
  const x = (d: string) => PAD.left + (x1 === x0 ? 0.5 : (t(d) - x0) / (x1 - x0)) * (W - PAD.left - PAD.right)
  const y = (a: number) => PAD.top + (1 - (a - (lo - span * 0.25)) / (span * 1.5)) * (H - PAD.top - PAD.bottom)
  // A price holds until the next payment changes it, so the line steps instead of sloping between points
  const path = points
    .map((p, i) => (i === 0 ? `M${x(p.date)},${y(p.amount)}` : `H${x(p.date)}V${y(p.amount)}`))
    .join('')
  const pick = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W
    let best = 0

    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) {
        best = i
      }
    })
    setHover(best)
  }
  const shown = all ? payments : payments.slice(0, SHOWN)
  const h = hover === null ? null : points[hover]

  return (
    <div className="mt-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-28 w-full touch-none"
          role="img"
          aria-label={`Payments from ${niceDate(points[0].date)} to ${niceDate(last.date)}, between ${formatCurrency(lo, currency)} and ${formatCurrency(hi, currency)}`}
          onPointerMove={e => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
        >
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={H - PAD.bottom}
            y2={H - PAD.bottom}
            className="stroke-midnight-700"
          />
          <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          {h && (
            <line
              x1={x(h.date)}
              x2={x(h.date)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-midnight-500"
              strokeDasharray="3 3"
            />
          )}
          {/* The latest payment is marked; the one under the pointer too, with a ring in the surface colour */}
          {[last, ...(h && h !== last ? [h] : [])].map(p => (
            <circle
              key={p.ref}
              cx={x(p.date)}
              cy={y(p.amount)}
              r={4}
              fill={color}
              className="stroke-midnight-900"
              strokeWidth={2}
            />
          ))}
          <text x={PAD.left} y={H - 6} className="fill-midnight-500 text-[10px]">
            {niceDate(points[0].date)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-midnight-500 text-[10px]">
            {niceDate(last.date)}
          </text>
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-midnight-600 bg-midnight-800 px-2 py-1 text-xs text-white shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, (x(h.date) / W) * 100))}%` }}
          >
            {formatCurrency(h.amount, currency)} <span className="text-midnight-400">· {niceDate(h.date)}</span>
          </div>
        )}
      </div>
      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">Payments</caption>
        <tbody>
          {shown.map(p => (
            <tr key={p.ref} className="border-t border-midnight-800">
              <td className="whitespace-nowrap py-1.5 pr-3 text-midnight-400">{niceDate(p.date)}</td>
              <td className="w-full max-w-0 truncate py-1.5 pr-3 text-midnight-500" title={p.description}>
                {p.description}
              </td>
              <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-white">
                {formatCurrency(p.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payments.length > SHOWN && (
        <button className="mt-1 text-xs text-midnight-400 underline" onClick={() => setAll(v => !v)}>
          {all ? 'Show fewer' : `Show all ${payments.length}`}
        </button>
      )}
    </div>
  )
}
