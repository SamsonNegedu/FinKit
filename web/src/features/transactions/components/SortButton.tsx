import type { ReactNode } from 'react'
import { ArrowUpDown } from 'lucide-react'
import type { SortField } from './transactionTableTypes'

export default function SortButton({
  field,
  active,
  onSort,
  children,
}: {
  field: SortField
  active: boolean
  onSort: (field: SortField) => void
  children: ReactNode
}) {
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-white transition-colors">
      {children}
      <ArrowUpDown className={`w-3 h-3 ${active ? 'text-accent' : 'text-midnight-500'}`} />
    </button>
  )
}
