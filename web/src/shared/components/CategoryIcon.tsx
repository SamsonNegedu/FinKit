import {
  ArrowLeftRight,
  Banknote,
  BedDouble,
  Bus,
  Car,
  Clapperboard,
  Ellipsis,
  Gift,
  HeartPulse,
  House,
  PiggyBank,
  Plane,
  Radio,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Ticket,
  TrainFront,
  TrendingUp,
  Utensils,
  UtensilsCrossed,
  Users,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { lazy, Suspense } from 'react'
import { getCategoryColor } from '@/shared/utils/categorizer/categoryMeta'
import { getCategoryStyle } from '@/shared/utils/categorizer/categoryStyle'
import { ICON_SET } from './categoryIconSet'

const DynamicCategoryIcon = lazy(() => import('./DynamicCategoryIcon'))

const ICONS: Record<string, LucideIcon> = {
  Rent: House,
  'Eating Out': UtensilsCrossed,
  'Personal Entertainment': Clapperboard,
  Subscriptions: Repeat,
  Car,
  'Public Transport': Bus,
  Internet: Wifi,
  Electricity: Zap,
  Insurance: ShieldCheck,
  Travel: Plane,
  Groceries: ShoppingBasket,
  Family: Users,
  'Radio Tax': Radio,
  'Health & Wellbeing': HeartPulse,
  Shopping: ShoppingBag,
  Other: Ellipsis,
  Gifts: Gift,
  Income: Wallet,
  Cash: Banknote,
  Savings: PiggyBank,
  Investment: TrendingUp,
  Transfer: ArrowLeftRight,
  // Trip categories, which have names of their own
  Accommodation: BedDouble,
  Transport: TrainFront,
  'Food & drink': Utensils,
  Activities: Ticket,
  Souvenir: Gift,
  'Money put in': Wallet,
}

/** A category's icon in a badge tinted with its color. A category you made yourself gets a tag. */
export default function CategoryIcon({
  category,
  size = 'md',
  color: given,
}: {
  category: string | undefined
  size?: 'sm' | 'md'
  /** Where the category has its own color scheme (trips), use that instead of the monthly one */
  color?: string
}) {
  // An icon someone chose applies to their own categories, not to a trip's, which have names of their own
  const chosenName = given ? undefined : getCategoryStyle(category)?.icon
  const chosen = chosenName ? ICON_SET[chosenName] : undefined
  // A name outside the short list is any other Lucide icon, loaded when needed
  const other = chosenName && !chosen ? chosenName : undefined
  const Icon = chosen ?? ICONS[category || 'Other'] ?? Tag
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const color = given ?? getCategoryColor(category)

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg ${size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'}`}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
      aria-hidden="true"
    >
      {other ? (
        <Suspense fallback={<Tag className={iconClass} />}>
          <DynamicCategoryIcon name={other} className={iconClass} />
        </Suspense>
      ) : (
        <Icon className={iconClass} />
      )}
    </span>
  )
}
