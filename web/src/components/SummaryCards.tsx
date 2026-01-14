import { TrendingUp, TrendingDown, Wallet, CalendarDays } from 'lucide-react'
import { AnalysisSummary } from '../types'

interface SummaryCardsProps {
  summary: AnalysisSummary
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Income',
      value: formatCurrency(summary.totalIncome, summary.currency),
      icon: TrendingUp,
      color: 'text-income',
      bgColor: 'bg-income/10',
    },
    {
      label: 'Expenses',
      value: formatCurrency(summary.totalExpense, summary.currency),
      icon: TrendingDown,
      color: 'text-expense',
      bgColor: 'bg-expense/10',
    },
    {
      label: 'Balance',
      value: formatCurrency(summary.balance, summary.currency),
      icon: Wallet,
      color: summary.balance >= 0 ? 'text-income' : 'text-expense',
      bgColor: summary.balance >= 0 ? 'bg-income/10' : 'bg-expense/10',
    },
    {
      label: 'Avg Daily Spend',
      value: formatCurrency(summary.avgDailySpend, summary.currency),
      icon: CalendarDays,
      color: 'text-midnight-300',
      bgColor: 'bg-midnight-700',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card">
          <div className="flex items-center justify-between">
            <p className="text-midnight-400 text-sm font-medium">{card.label}</p>
            <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
