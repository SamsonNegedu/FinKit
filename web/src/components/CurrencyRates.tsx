import { useState } from 'react'
import { RateMap } from '../lib/rates'

interface CurrencyRatesProps {
  base: string
  foreign: string[]
  rates: RateMap
  onChange: (rates: RateMap) => void
}

// Shown only when the data has more than one currency: lets you enter a rate for each foreign one
export default function CurrencyRates({ base, foreign, rates, onChange }: CurrencyRatesProps) {
  const [open, setOpen] = useState(false)
  if (foreign.length === 0) return null

  const missing = foreign.filter(c => !(rates[c] > 0))
  const set = (currency: string, value: string) => {
    const n = parseFloat(value.replace(',', '.'))
    const next = { ...rates }
    if (n > 0) next[currency] = n
    else delete next[currency]
    onChange(next)
  }

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        missing.length ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-midnight-900 border-midnight-700 text-midnight-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p>
          {missing.length
            ? `${missing.join(', ')} not converted: totals add them as ${base}.`
            : `Converted to ${base} using your rates (${foreign.map(c => `${c} ${rates[c]}`).join(', ')}).`}
        </p>
        <button className="underline shrink-0" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'Hide' : 'Set exchange rates'}
        </button>
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap gap-4">
          {foreign.map(c => (
            <label key={c} className="flex items-center gap-2 text-midnight-200">
              1 {c} =
              <input
                type="text"
                inputMode="decimal"
                defaultValue={rates[c] ?? ''}
                onBlur={(e) => set(c, e.target.value)}
                placeholder="0.00"
                className="input w-24 py-1 text-sm"
                aria-label={`Rate: 1 ${c} in ${base}`}
              />
              {base}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
