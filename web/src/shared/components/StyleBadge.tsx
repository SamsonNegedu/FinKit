import { lazy, Suspense } from 'react'
import { Tag } from 'lucide-react'
import { ICON_SET } from './categoryIconSet'

const DynamicCategoryIcon = lazy(() => import('./DynamicCategoryIcon'))

function BadgeIcon({ icon }: { icon?: string }) {
  const Static = icon ? ICON_SET[icon] : undefined

  if (Static) {
    return <Static className="h-3.5 w-3.5" />
  }
  if (icon) {
    return (
      <Suspense fallback={<Tag className="h-3.5 w-3.5" />}>
        <DynamicCategoryIcon name={icon} className="h-3.5 w-3.5" />
      </Suspense>
    )
  }

  return <Tag className="h-3.5 w-3.5" />
}

/** An icon in a tinted badge from a name and a color, for a category that is not saved yet. */
export default function StyleBadge({ icon, color }: { icon?: string; color: string }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
      aria-hidden="true"
    >
      <BadgeIcon icon={icon} />
    </span>
  )
}
