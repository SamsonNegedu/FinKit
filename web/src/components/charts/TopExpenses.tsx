interface TopExpensesProps {
  topMerchants: { merchant: string; total: number; count: number }[]
  currency: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function TopExpenses({ topMerchants, currency }: TopExpensesProps) {
  const maxTotal = topMerchants[0]?.total || 1

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Top Merchants</h3>

      {topMerchants.length > 0 ? (
        <div className="space-y-3">
          {topMerchants.slice(0, 8).map((merchant, index) => (
            <div key={merchant.merchant} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-midnight-700 flex items-center justify-center text-xs font-medium text-midnight-400">
                    {index + 1}
                  </span>
                  <span className="text-sm text-white truncate max-w-[200px]">
                    {merchant.merchant}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(merchant.total, currency)}
                  </span>
                  <span className="text-xs text-midnight-500 ml-2">
                    ({merchant.count}x)
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-midnight-800 rounded-full overflow-hidden ml-9">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all group-hover:opacity-80"
                  style={{ width: `${(merchant.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-midnight-400">No merchant data to display</p>
        </div>
      )}
    </div>
  )
}
