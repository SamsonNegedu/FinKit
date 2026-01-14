import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Transaction, DateRange } from '../../types'

interface SpendingTrendProps {
  transactions: Transaction[]
  dateRange: DateRange | null
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

export default function SpendingTrend({ transactions, dateRange, currency }: SpendingTrendProps) {
  const dailyData = useMemo(() => {
    // Group transactions by date
    const byDate = new Map<string, { expenses: number; income: number }>()
    
    for (const tx of transactions) {
      if (tx.isExcluded || tx.category === 'Transfer') continue
      
      const date = tx.date
      const existing = byDate.get(date) || { expenses: 0, income: 0 }
      
      if (tx.type === 'expense') {
        existing.expenses += tx.amount
      } else {
        existing.income += tx.amount
      }
      
      byDate.set(date, existing)
    }

    // Fill in missing dates
    if (dateRange) {
      const current = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, { expenses: 0, income: 0 })
        }
        current.setDate(current.getDate() + 1)
      }
    }

    // Convert to array and sort
    return Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
        expenses: data.expenses,
        income: data.income,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions, dateRange])

  // Calculate cumulative spending
  const cumulativeData = useMemo(() => {
    let cumulative = 0
    return dailyData.map(d => {
      cumulative += d.expenses
      return { ...d, cumulative }
    })
  }, [dailyData])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-midnight-800 border border-midnight-600 rounded-lg px-3 py-2 shadow-xl">
          <p className="font-medium text-white mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value, currency)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Spending Trend</h3>

      {dailyData.length > 0 ? (
        <div className="space-y-8">
          {/* Daily Spending Chart */}
          <div>
            <h4 className="text-sm font-medium text-midnight-400 mb-3">Daily Expenses</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#627d98"
                    fontSize={12}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#627d98"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v, currency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    fill="url(#expenseGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative Spending Chart */}
          <div>
            <h4 className="text-sm font-medium text-midnight-400 mb-3">Cumulative Spending</h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#627d98"
                    fontSize={12}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#627d98"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v, currency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Total Spent"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-midnight-400">No transaction data to display</p>
        </div>
      )}
    </div>
  )
}
