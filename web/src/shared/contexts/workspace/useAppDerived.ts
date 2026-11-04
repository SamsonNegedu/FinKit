import { useMemo } from 'react'
import type { Transaction } from '@/shared/types'
import { applyRates, baseCurrencyOf, foreignCurrenciesOf, type RateMap } from '@/shared/utils/rates'

/** Rates, base currency, and the transaction list shown in analytics and budgets (trips excluded). */
export function useAppDerived(transactions: Transaction[], withoutTrips: Transaction[], rateForBase: RateMap) {
  const baseCurrency = useMemo(() => baseCurrencyOf(transactions), [transactions])
  const foreignCurrencies = useMemo(() => foreignCurrenciesOf(transactions, baseCurrency), [transactions, baseCurrency])
  const rates = rateForBase
  const displayTransactions = useMemo(
    () => applyRates(withoutTrips, baseCurrency, rates),
    [withoutTrips, baseCurrency, rates],
  )

  return { baseCurrency, foreignCurrencies, rates, displayTransactions }
}
