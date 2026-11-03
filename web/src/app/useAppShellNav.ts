import {
  BookOpen,
  Inbox,
  Landmark,
  LayoutDashboard,
  List,
  PieChart,
  Plane,
  Repeat,
  Settings,
  Target,
  Wallet,
} from 'lucide-react'
import type { AppShellNavItem } from './AppShellSidebar'

export function useAppShellNav(bankingEnabled: boolean, attention: number, reviewCount: number): AppShellNavItem[] {
  const COLLECT = 'Collect'
  const BALANCE = 'Balance the month'
  const INSIGHTS = 'Insights'

  return [
    { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
    {
      to: '/banks',
      label: 'Banks',
      icon: Landmark,
      badge: attention,
      hidden: !bankingEnabled,
      group: COLLECT,
    },
    { to: '/transactions', label: 'Transactions', icon: List, group: COLLECT },
    {
      to: '/trips',
      label: 'Trips',
      icon: Plane,
      hidden: !bankingEnabled,
      group: BALANCE,
    },
    {
      to: '/review',
      label: 'Review',
      icon: Inbox,
      badge: reviewCount,
      group: BALANCE,
    },
    { to: '/income', label: 'Income', icon: Wallet, group: BALANCE },
    { to: '/analytics', label: 'Analytics', icon: PieChart, group: INSIGHTS },
    { to: '/budgets', label: 'Budgets', icon: Target, group: INSIGHTS },
    {
      to: '/contracts',
      label: 'Recurring payments',
      icon: Repeat,
      hidden: !bankingEnabled,
      group: INSIGHTS,
    },
    { to: '/guide/start', label: 'Guide', icon: BookOpen, group: 'Setup' },
    { to: '/settings', label: 'Settings', icon: Settings, group: 'Setup' },
  ]
}
