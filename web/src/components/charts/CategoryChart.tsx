import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CategorySummary } from '../../types'

interface CategoryChartProps {
  categorySummary: CategorySummary[]
  currency: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function CategoryChart({ categorySummary, currency }: CategoryChartProps) {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-midnight-800 border border-midnight-600 rounded-lg px-3 py-2 shadow-xl">
          <p className="font-medium text-white">{data.category}</p>
          <p className="text-sm text-midnight-300">
            {formatCurrency(data.total, currency)} ({data.percentage.toFixed(1)}%)
          </p>
          <p className="text-xs text-midnight-400">{data.count} transactions</p>
        </div>
      )
    }
    return null
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
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-midnight-400">No expense data to display</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-midnight-300 truncate">{item.category}</span>
            <span className="text-sm text-midnight-500 ml-auto">{item.percentage.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
