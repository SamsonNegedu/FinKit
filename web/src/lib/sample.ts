// Builds a small demo CSV in memory so first-time users can try the app without a bank export.
export function createSampleFile(): File {
  const today = new Date()
  const rows: Array<[number, number, string, string]> = [
    // [days ago, amount, payee, description]
    [2, -12.99, 'DeepSeek', 'DeepSeek API credits'],
    [9, -12.99, 'DeepSeek', 'DeepSeek API credits'],
    [16, -25.0, 'DeepSeek', 'DeepSeek API top up'],
    [23, -12.99, 'DeepSeek', 'DeepSeek API credits'],
    [3, -54.3, 'REWE Markt GmbH', 'REWE Einkauf'],
    [10, -38.75, 'REWE Markt GmbH', 'REWE Einkauf'],
    [17, -61.2, 'REWE Markt GmbH', 'REWE Einkauf'],
    [5, -9.99, 'Netflix', 'Netflix subscription'],
    [5, -10.99, 'Spotify', 'Spotify Premium'],
    [7, -42.0, 'Shell', 'Fuel'],
    [14, -47.5, 'Shell', 'Fuel'],
    [8, -23.4, 'Mystery Shop Ltd', 'Card payment 4411'],
    [12, -88.0, 'Unknown Vendor AG', 'Invoice 20931'],
    [1, 2800.0, 'Acme GmbH', 'Salary'],
    [28, 2800.0, 'Acme GmbH', 'Salary'],
  ]
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const lines = ['Date,Amount,Currency,Payee,Description']
  for (const [ago, amount, payee, desc] of rows) {
    const d = new Date(today)
    d.setDate(d.getDate() - ago)
    lines.push(`${fmt(d)},${amount},EUR,"${payee}","${desc}"`)
  }
  return new File([lines.join('\n')], 'sample-transactions.csv', { type: 'text/csv' })
}
