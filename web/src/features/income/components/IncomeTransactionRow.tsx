import Tooltip from '@/shared/components/Tooltip'
import { ArrowLeftRight, Check, X, Eye, EyeOff } from 'lucide-react'
import { Transaction } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import { formatDay } from '@/shared/utils/dates'

interface IncomeTransactionRowProps {
  tx: Transaction
  currency: string
  onToggleExclude: (id: string, currentlyExcluded: boolean) => void
}

export default function IncomeTransactionRow({ tx, currency, onToggleExclude }: IncomeTransactionRowProps) {
  return (
    <div
      className={`
                flex items-center gap-4 p-4 rounded-lg border transition-all
                ${
                  tx.isExcluded
                    ? 'bg-midnight-800/50 border-line-strong opacity-60'
                    : 'bg-midnight-800 border-line-strong'
                }
              `}
    >
      <Tooltip label={tx.isExcluded ? 'Click to include in totals' : 'Click to exclude from totals'}>
        <button
          onClick={() => onToggleExclude(tx.id, tx.isExcluded || false)}
          className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0
                  ${
                    tx.isExcluded
                      ? 'bg-warning/20 text-warning hover:bg-warning/30'
                      : 'bg-income/20 text-income hover:bg-income/30'
                  }
                `}
        >
          {tx.isExcluded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </Tooltip>

      <div className="w-16 shrink-0">
        <span className="text-sm text-midnight-300">{formatDay(tx.date)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{tx.merchant || tx.recipient || tx.description.slice(0, 40)}</p>
        <p className="text-xs text-midnight-500 truncate">{tx.description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {tx.doubleBookingMatch && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-info/20 text-info">
            <ArrowLeftRight className="w-3 h-3" />
            Auto
          </span>
        )}
        {tx.isExcluded && !tx.doubleBookingMatch && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-warning/20 text-warning">
            <X className="w-3 h-3" />
            Manual
          </span>
        )}
        {!tx.isExcluded && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-income/20 text-income">
            <Check className="w-3 h-3" />
            Counted
          </span>
        )}
      </div>

      <div className="w-28 text-right shrink-0">
        <span className={`text-sm font-medium ${tx.isExcluded ? 'text-midnight-400 line-through' : 'text-income'}`}>
          +{formatCurrency(tx.amount, currency)}
        </span>
      </div>

      <div className="w-32 text-right shrink-0 hidden lg:block">
        <span className="text-xs text-midnight-500 truncate block">{tx.referenceAccountName || 'Unknown'}</span>
      </div>
    </div>
  )
}
