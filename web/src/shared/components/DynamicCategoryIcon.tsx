import { Tag } from 'lucide-react'
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'

/**
 * Any icon in the Lucide set, by name, fetched only when it is shown. Kept in its own file and loaded on demand,
 * because the list of every name is large and most people use none of them.
 */
export default function DynamicCategoryIcon({ name, className }: { name: string; className?: string }) {
  return <DynamicIcon name={name as IconName} className={className} fallback={Tag as never} />
}
