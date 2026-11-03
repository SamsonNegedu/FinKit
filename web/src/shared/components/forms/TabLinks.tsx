import { Link, type LinkProps } from '@tanstack/react-router'

export interface TabLink {
  label: string
  link: LinkProps
  active: boolean
}

/**
 * Tabs that are really pages: each one is a link, so the address changes and back works. They look like `Tabs`,
 * but are marked up as navigation (`aria-current`), not as a tab list, because the content is not on this page.
 */
export default function TabLinks({
  links,
  ariaLabel,
  className = '',
}: {
  links: TabLink[]
  ariaLabel: string
  className?: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line-strong ${className}`}
    >
      {links.map(l => (
        <Link
          key={l.label}
          {...l.link}
          aria-current={l.active ? 'page' : undefined}
          className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:text-ink ${
            l.active ? 'border-accent text-ink' : 'border-transparent text-midnight-400 hover:text-ink'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
