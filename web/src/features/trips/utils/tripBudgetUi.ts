/** Progress fill on a trip budget bar: over budget, close to the cap, or comfortably under. */
export function tripBudgetBarFillClass(over: boolean, spentRatio: number): string {
  if (over) {
    return 'bg-expense'
  }
  if (spentRatio > 0.8) {
    return 'bg-warning'
  }

  return 'bg-income'
}

export function tripBudgetCaption(options: {
  budget: number | undefined
  over: boolean
  spent: number
  funded: number
  remaining: number
  money: (n: number) => string
}): string {
  const { budget, over, spent, funded, remaining, money } = options

  if (budget !== undefined) {
    if (over) {
      return `${money(spent - budget)} over ${money(budget)}`
    }

    return `${money(budget - spent)} left of ${money(budget)}`
  }
  if (funded > 0) {
    // A negative "left" reads like a typo; say it plainly, the same as the breakdown's "Overspent by"
    return remaining < 0 ? `${money(-remaining)} over what was put in` : `${money(remaining)} left`
  }

  return ''
}

export function compareTripYearKeys(a: string, b: string, undatedLabel: string): number {
  if (a === undatedLabel) {
    return 1
  }
  if (b === undatedLabel) {
    return -1
  }

  return b.localeCompare(a)
}
