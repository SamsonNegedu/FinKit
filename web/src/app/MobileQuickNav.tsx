import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import type { AppShellNavItem } from './AppShellSidebar'

export default function MobileQuickNav({ nav, onOpenNav }: { nav: AppShellNavItem[]; onOpenNav: () => void }) {
  return (
    <nav
      aria-label="Quick"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="flex">
        {nav
          .filter(n => ['/', '/transactions', '/review', '/banks'].includes(n.to) && !n.hidden)
          .slice(0, 4)
          .map(item => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-midnight-400"
                activeProps={{ className: '!text-accent' }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {!!item.badge && (
                  <span className="absolute top-1 left-1/2 ml-2 min-w-4 px-1 rounded-full bg-warning text-[10px] font-semibold text-midnight-950 text-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        <li className="flex-1">
          <button
            onClick={onOpenNav}
            className="w-full flex flex-col items-center gap-0.5 py-2 text-[11px] text-midnight-400"
          >
            <Menu className="w-5 h-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}
