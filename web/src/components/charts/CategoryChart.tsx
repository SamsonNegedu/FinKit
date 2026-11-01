import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CategorySummary } from '../../types'
import { formatCurrency } from '../../lib/format'

interface CategoryChartProps {
  categorySummary: CategorySummary[]
  currency: string
  onSelectCategory?: (category: string) => void
}

function CategoryTooltip({ active, payload, currency }: { active?: boolean; payload?: any[]; currency: string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div className="bg-midnight-800 border border-midnight-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium text-white">{entry.category}</p>
      <p className="text-sm text-midnight-300">
        {formatCurrency(entry.total, currency)} ({entry.percentage.toFixed(1)}%)
      </p>
      <p className="text-xs text-midnight-400">{entry.count} transactions</p>
    </div>
  )
}

export default function CategoryChart({ categorySummary, currency, onSelectCategory }: CategoryChartProps) {
  // The grouped "Other (n categories)" slice isn't a real category, so it isn't clickable
  const select = (category: string) => {
    if (onSelectCategory && !category.startsWith('Other (')) onSelectCategory(category)
  }
  // Take top 8 categories and group rest as "Other"
  const topCategories = categorySummary.slice(0, 8)
  const otherCategories = categorySummary.slice(8)

  const data = [...topCategories]
  if (otherCategories.length > 0) {
    const otherTotal = otherCategories.reduce((sum, c) => sum + c.total, 0)
    const otherCount = otherCategories.reduce((sum, c) => sum + c.count, 0)
    const otherPercentage = otherCategories.reduce((sum, c) => sum + c.percentage, 0)
    data.push({
      category: `Other (${otherCategories.length} categories)`,
      total: otherTotal,
      count: otherCount,
      percentage: otherPercentage,
      color: '#64748b',
    })
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Spending by Category</h3>

      {data.length > 0 ? (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="total"
                nameKey="category"
                onClick={(entry: any) => select(entry.category)}
                cursor={onSelectCategory ? 'pointer' : undefined}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-midnight-400">No expense data to display</p>
        </div>
      )}

      {/* Legend: every slice with what it cost */}
      <ul className="mt-4 space-y-1">
        {data.map(item => (
          <li key={item.category}>
            <button
              onClick={() => select(item.category)}
              className="w-full flex items-center gap-2 text-left hover:bg-midnight-800 rounded px-1.5 py-1"
              title={onSelectCategory ? `Show ${item.category} transactions` : undefined}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-midnight-200 truncate">{item.category}</span>
              <span className="text-sm text-white ml-auto tabular-nums">{formatCurrency(item.total, currency)}</span>
              <span className="text-xs text-midnight-500 w-10 text-right tabular-nums">
                {item.percentage.toFixed(0)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
