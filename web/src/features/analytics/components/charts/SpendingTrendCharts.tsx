import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { formatCurrency } from '@/shared/utils/format'
import TrendTooltip from './TrendTooltip'

interface ChartPoint {
  displayDate: string
  expenses: number
  cumulative?: number
  cumulativeIncome?: number
}

interface SpendingTrendChartsProps {
  dailyData: ChartPoint[]
  cumulativeData: ChartPoint[]
  currency: string
}

export default function SpendingTrendCharts({ dailyData, cumulativeData, currency }: SpendingTrendChartsProps) {
  const axisProps = {
    stroke: '#627d98',
    fontSize: 12,
    tickLine: false,
    interval: 'preserveStartEnd' as const,
  }

  return (
    <div className="space-y-8">
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
              <XAxis dataKey="displayDate" {...axisProps} />
              <YAxis
                width={84}
                stroke="#627d98"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => formatCurrency(v, currency)}
              />
              <Tooltip content={<TrendTooltip currency={currency} />} />
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

      <div>
        <h4 className="text-sm font-medium text-midnight-400 mb-3">Income vs spending, running total</h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
              <XAxis dataKey="displayDate" {...axisProps} />
              <YAxis
                width={84}
                stroke="#627d98"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => formatCurrency(v, currency)}
              />
              <Tooltip content={<TrendTooltip currency={currency} />} />
              <Legend verticalAlign="top" height={28} iconType="plainline" />
              <Line
                type="monotone"
                dataKey="cumulativeIncome"
                name="Income"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line type="monotone" dataKey="cumulative" name="Spent" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
