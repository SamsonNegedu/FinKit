import { Check } from 'lucide-react'

export default function BankTile({
  name,
  selected,
  onSelect,
}: {
  name: string
  selected: boolean
  onSelect: (name: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(name)}
      aria-pressed={selected}
      className={`text-left p-3 rounded-xl border transition-colors ${selected ? 'border-accent bg-accent/10' : 'border-line-strong bg-midnight-800/40 hover:bg-midnight-800'}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-midnight-700 border border-line-strong grid place-items-center font-bold text-sm text-midnight-100">
          {name[0]}
        </div>
        <span className="font-medium text-ink text-sm truncate">{name}</span>
        {selected && <Check className="w-4 h-4 text-accent ml-auto shrink-0" />}
      </div>
    </button>
  )
}
