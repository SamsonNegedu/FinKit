import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency, formatWhole } from '@/shared/utils/format'
import type { TrendMonth } from '@/shared/utils/analysis/monthlyTrend'

// The same hues as everywhere else: spending red, income green, put away (investments, savings) cyan
const SPENT = '#ef4444'
const PUT_AWAY = '#06b6d4'
const LEFT_OVER = '#10b981'
const INCOME = '#e2e8f0'

function MonthTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean
  payload?: Array<{ payload: TrendMonth }>
  currency: string
}) {
  if (!active || !payload?.length) {
    return null
  }
  const m = payload[0].payload
  const money = (n: number) => formatCurrency(n, currency)
  const rows: Array<[string, string, number]> = [
    ['Income', INCOME, m.income],
    ['Spent', SPENT, m.spent],
    ['Put away', PUT_AWAY, m.putAway],
    ...(m.over > 0 ? ([['Over income by', SPENT, m.over]] as Array<[string, string, number]>) : []),
    ...(m.over === 0 ? ([['Left over', LEFT_OVER, m.leftOver]] as Array<[string, string, number]>) : []),
  ]

  return (
    <div className="rounded-lg border border-midnight-600 bg-midnight-800 px-3 py-2 shadow-xl">
      <p className="mb-1 font-medium text-white">{m.label}</p>
      {rows.map(([name, color, value]) => (
        <p key={name} className="text-sm" style={{ color }}>
          {name}: {money(value)}
        </p>
      ))}
    </div>
  )
}

/**
 * One bar a month, as tall as what was spent plus put away plus left over, with income as a line across: a month
 * whose bar pokes above the line spent more than came in. Click a month to see where it went.
 */
export default function MonthlyTrend({
  months,
  currency,
  onSelectMonth,
}: {
  months: TrendMonth[]
  currency: string
  onSelectMonth: (m: TrendMonth) => void
}) {
  return (
    <div className="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334e68" vertical={false} />
          <XAxis dataKey="label" stroke="#627d98" fontSize={12} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            width={72}
            stroke="#627d98"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => formatWhole(v)}
          />
          <Tooltip content={<MonthTooltip currency={currency} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar
            dataKey="spent"
            name="Spent"
            stackId="income"
            fill={SPENT}
            cursor="pointer"
            onClick={(_, i) => onSelectMonth(months[i])}
          />
          <Bar
            dataKey="putAway"
            name="Put away"
            stackId="income"
            fill={PUT_AWAY}
            cursor="pointer"
            onClick={(_, i) => onSelectMonth(months[i])}
          />
          <Bar
            dataKey="leftOver"
            name="Left over"
            stackId="income"
            fill={LEFT_OVER}
            cursor="pointer"
            onClick={(_, i) => onSelectMonth(months[i])}
          />
          <Line
            type="linear"
            dataKey="income"
            name="Income"
            stroke={INCOME}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 2.5, fill: INCOME, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
