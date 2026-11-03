import SortButton from './SortButton'
import type { SortField } from './transactionTableTypes'
import Checkbox from '@/shared/components/forms/Checkbox'

export interface TransactionTableHeadProps {
  allSelected: boolean
  onSelectAll: () => void
  sortField: SortField
  onSort: (field: SortField) => void
}

export default function TransactionTableHead({
  allSelected,
  onSelectAll,
  sortField,
  onSort,
}: TransactionTableHeadProps) {
  return (
    <thead className="max-md:hidden">
      <tr className="border-b border-line-strong">
        <th className="md:sticky md:top-[63px] md:z-10 bg-surface md:first:rounded-tl-xl md:last:rounded-tr-xl relative p-0 w-14">
          <label
            aria-label="Select all"
            className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-midnight-700/40"
          >
            <Checkbox checked={allSelected} ariaLabel="Select all" onChange={onSelectAll} />
          </label>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-surface md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 w-28 text-left text-sm font-medium text-midnight-400">
          <SortButton field="date" active={sortField === 'date'} onSort={onSort}>
            Date
          </SortButton>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-surface md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 text-left text-sm font-medium text-midnight-400">
          <SortButton field="description" active={sortField === 'description'} onSort={onSort}>
            Description
          </SortButton>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-surface md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 w-56 text-left text-sm font-medium text-midnight-400">
          <SortButton field="category" active={sortField === 'category'} onSort={onSort}>
            Category
          </SortButton>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-surface md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 w-32 text-right text-sm font-medium text-midnight-400">
          <SortButton field="amount" active={sortField === 'amount'} onSort={onSort}>
            Amount
          </SortButton>
        </th>
      </tr>
    </thead>
  )
}
