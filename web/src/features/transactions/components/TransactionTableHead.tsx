import SortButton from './SortButton'
import type { SortField } from './transactionTableTypes'

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
      <tr className="border-b border-midnight-700">
        <th className="md:sticky md:top-[63px] md:z-10 bg-midnight-900 md:first:rounded-tl-xl md:last:rounded-tr-xl relative p-0 w-14">
          <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-midnight-700/40">
            <input
              type="checkbox"
              checked={allSelected}
              aria-label="Select all"
              onChange={onSelectAll}
              className="w-5 h-5 cursor-pointer rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
            />
          </label>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-midnight-900 md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 w-28 text-left text-sm font-medium text-midnight-400">
          <SortButton field="date" active={sortField === 'date'} onSort={onSort}>
            Date
          </SortButton>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-midnight-900 md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 text-left text-sm font-medium text-midnight-400">
          <SortButton field="description" active={sortField === 'description'} onSort={onSort}>
            Description
          </SortButton>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-midnight-900 md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 w-56 text-left text-sm font-medium text-midnight-400">
          <SortButton field="category" active={sortField === 'category'} onSort={onSort}>
            Category
          </SortButton>
        </th>
        <th className="md:sticky md:top-[63px] md:z-10 bg-midnight-900 md:first:rounded-tl-xl md:last:rounded-tr-xl py-3 px-4 w-32 text-right text-sm font-medium text-midnight-400">
          <SortButton field="amount" active={sortField === 'amount'} onSort={onSort}>
            Amount
          </SortButton>
        </th>
      </tr>
    </thead>
  )
}
