import { formatCurrency } from '@/shared/utils/format'

export default function TrendTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  currency: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-midnight-800 border border-midnight-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value ?? 0, currency)}
        </p>
      ))}
    </div>
  )
}
