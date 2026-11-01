import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

export interface AppShellNavItem {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: number
  hidden?: boolean
}

interface AppShellSidebarProps {
  nav: AppShellNavItem[]
  onNavigate?: () => void
}

export default function AppShellSidebar({ nav, onNavigate }: AppShellSidebarProps) {
  return (
    <nav aria-label="Main" className="flex flex-col h-full">
      <div className="px-4 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
          <span className="text-lg font-bold text-white">F</span>
        </div>
        <div>
          <p className="font-bold text-white leading-tight">FinKit</p>
          <p className="text-[11px] text-midnight-400">Transaction insights</p>
        </div>
      </div>
      <ul className="px-2 space-y-0.5 flex-1">
        {nav
          .filter(n => !n.hidden)
          .map(item => (
            <li key={item.to}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.exact }}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-midnight-300 hover:bg-midnight-800 hover:text-white transition-colors"
                activeProps={{ className: 'bg-accent/15 !text-white font-medium' }}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${item.to === '/banks' ? 'bg-amber-500/20 text-amber-300' : 'bg-midnight-700 text-midnight-200'}`}
                    aria-label={`${item.badge} need attention`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
      </ul>
      <div className="px-4 py-4 text-xs text-midnight-500 flex gap-3">
        <a href="/privacy.html" className="hover:text-midnight-300">
          Privacy
        </a>
        <a href="/terms.html" className="hover:text-midnight-300">
          Terms
        </a>
      </div>
    </nav>
  )
}
