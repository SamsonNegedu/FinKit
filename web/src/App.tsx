import { useState, useRef } from 'react'
import { Transaction, DateRange, SheetConfig, RawTransaction } from './types'
import Dashboard from './components/Dashboard'
import FileUpload from './components/FileUpload'
import { parseFile } from './lib/parser'
import { anonymizeTransactions, processWithoutAnonymization } from './lib/anonymizer'
import { categorizeWithRules } from './lib/categorizer'
import { detectRecurring } from './lib/recurring'
import { detectDoubleBookings } from './lib/double-booking'
import { Shield, ShieldOff } from 'lucide-react'

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null)
  const [anonymizationEnabled, setAnonymizationEnabled] = useState(true)
  
  // Store raw transactions to allow toggling anonymization
  const rawTransactionsRef = useRef<RawTransaction[]>([])

  const processTransactions = (raw: RawTransaction[], anonymize: boolean) => {
    // Process with or without anonymization
    const processed = anonymize 
      ? anonymizeTransactions(raw).transactions
      : processWithoutAnonymization(raw)
    
    // Apply rule-based categorization
    const categorized = categorizeWithRules(processed)
    
    // Detect double-bookings (internal transfers between own accounts)
    const { transactions: withDoubleBookings } = detectDoubleBookings(categorized)
    
    // Detect recurring transactions
    return detectRecurring(withDoubleBookings)
  }

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Parse file (CSV, Excel, or OFX)
      const rawTransactions = await parseFile(file)
      rawTransactionsRef.current = rawTransactions
      
      // Process transactions
      const processed = processTransactions(rawTransactions, anonymizationEnabled)
      setTransactions(processed)
      
      // Auto-detect date range from the actual transaction data
      if (processed.length > 0) {
        const dates = processed.map(tx => new Date(tx.date).getTime())
        const minDate = new Date(Math.min(...dates))
        const maxDate = new Date(Math.max(...dates))
        
        // Set to the month range of the data
        setDateRange({
          startDate: new Date(minDate.getFullYear(), minDate.getMonth(), 1),
          endDate: new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0) // Last day of month
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleAnonymization = () => {
    const newValue = !anonymizationEnabled
    setAnonymizationEnabled(newValue)
    
    // Re-process transactions with new anonymization setting
    if (rawTransactionsRef.current.length > 0) {
      const processed = processTransactions(rawTransactionsRef.current, newValue)
      setTransactions(processed)
    }
  }

  const handleClearData = () => {
    setTransactions([])
    setDateRange(null)
    setError(null)
  }

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates, categorySource: 'manual' as const } : t)
    )
  }

  const handleBulkUpdate = (ids: string[], updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => ids.includes(t.id) ? { ...t, ...updates, categorySource: 'manual' as const } : t)
    )
  }

  return (
    <div className="min-h-screen bg-midnight-950">
      <header className="border-b border-midnight-800 bg-midnight-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <span className="text-xl font-bold text-white">T</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Transaction Analyser</h1>
                <p className="text-xs text-midnight-400">Privacy-first expense tracking</p>
              </div>
            </div>
            {transactions.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleAnonymization}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${anonymizationEnabled 
                      ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30' 
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                    }
                  `}
                  title={anonymizationEnabled ? 'Click to show original data' : 'Click to anonymize data'}
                >
                  {anonymizationEnabled ? (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Anonymized</span>
                    </>
                  ) : (
                    <>
                      <ShieldOff className="w-4 h-4" />
                      <span>Original</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleClearData}
                  className="btn-secondary text-sm"
                >
                  Clear All Data
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {transactions.length === 0 ? (
          <FileUpload 
            onFileUpload={handleFileUpload} 
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <Dashboard
            transactions={transactions}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onUpdateTransaction={handleUpdateTransaction}
            onBulkUpdate={handleBulkUpdate}
            sheetConfig={sheetConfig}
            onSheetConfigChange={setSheetConfig}
          />
        )}
      </main>
    </div>
  )
}

export default App
