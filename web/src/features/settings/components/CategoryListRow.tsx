import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import CategoryIcon from '@/shared/components/CategoryIcon'
import Tooltip from '@/shared/components/Tooltip'
import { getCategoryColor, getCategoryStyle, type CategoryStyle } from '@/shared/utils/categorizer'
import { isUnused, otherUse, type CategoryUse } from '@/shared/utils/categorizer/categoryUse'
import CategoryStylePicker from './CategoryStylePicker'

const iconButton =
  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-midnight-300 hover:bg-midnight-700 hover:text-ink disabled:opacity-40'

export default function CategoryListRow({
  category,
  action,
  use,
  known,
  keepName,
  pending,
  onRestyle,
  onDeleteRequest,
}: {
  category: string
  action: ReactNode
  use: CategoryUse
  known: boolean
  keepName: string
  pending: boolean
  onRestyle: (change: CategoryStyle | null) => void
  onDeleteRequest: () => void
}) {
  const other = otherUse(use)
  const canDelete = known && category !== keepName && isUnused(use)

  return (
    <li className="flex items-center gap-3 border-t border-line py-2 first:border-t-0">
      <CategoryStylePicker
        label={`Change icon and color of ${category}`}
        style={getCategoryStyle(category)}
        color={getCategoryColor(category)}
        badge={<CategoryIcon category={category} size="sm" />}
        disabled={pending}
        onChange={onRestyle}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{category}</span>
        {other && <span className="block truncate text-xs text-midnight-500">{other}</span>}
      </span>
      <span className="text-xs tabular-nums text-midnight-500">
        {use.transactions} transaction{use.transactions === 1 ? '' : 's'}
      </span>
      {action}
      {canDelete && (
        <Tooltip label="Nothing uses it, so it can be deleted">
          <button className={iconButton} disabled={pending} aria-label={`Delete ${category}`} onClick={onDeleteRequest}>
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
    </li>
  )
}
