import type { ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight, type LucideIcon } from 'lucide-react'

const TONE = {
  danger: 'bg-rose-500/15 text-rose-400',
  warn: 'bg-amber-500/15 text-amber-400',
  info: 'bg-sky-500/15 text-sky-400',
} as const

/** One line in "Needs attention". The icon is the same one the sidebar uses for that page, so the kind reads at a glance. */
export default function AttentionRow({
  link,
  icon: Icon,
  tone,
  children,
}: {
  link: LinkProps
  icon: LucideIcon
  tone: keyof typeof TONE
  children: ReactNode
}) {
  return (
    <li>
      <Link {...link} className="flex items-center gap-3 rounded-lg bg-midnight-800/60 px-3 py-2 hover:bg-midnight-800">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-midnight-100">{children}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-midnight-400" aria-hidden="true" />
      </Link>
    </li>
  )
}
