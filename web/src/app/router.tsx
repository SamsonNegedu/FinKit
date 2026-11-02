import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { statusQuery } from '@/features/banking/hooks/banking-queries'
import {
  validateBackOfficeSearch,
  validateBanksSearch,
  validateConnectSearch,
} from '@/features/banking/constants/search.constants'
import { validateTripSearch } from '@/features/trips/constants/search.constants'
import { validateAnalyticsSearch } from '@/features/analytics/constants/search.constants'
import { validateTransactionsSearch } from '@/features/transactions/constants/search.constants'
import OverviewPage from '@/features/overview/routes'
import ReviewPage from '@/features/review/routes'
import IncomePage from '@/features/income/routes'
import ExportPage from '@/features/export/routes'
import SettingsPage from '@/features/settings/routes'
import { AnalyticsPage, TrendsPage } from '@/features/analytics/routes'
import { BanksPage, BankDetailPage, ConnectBankPage } from '@/features/banking/routes'
import TransactionsPage from '@/features/transactions/routes'
import MerchantPage from '@/features/transactions/routes/MerchantPage'
import { TripPage, TripsPage } from '@/features/trips/routes'
import { BudgetsPage } from '@/features/budgets/routes'
import { ContractsPage } from '@/features/contracts/routes'
import AppShell from '@/app/shell'

const root = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: AppShell,
  notFoundComponent: () => <p className="card text-midnight-300">That page doesn't exist.</p>,
})

const requireBanking = async ({ context }: { context: { queryClient: QueryClient } }) => {
  const status = await context.queryClient.ensureQueryData(statusQuery)

  if (!status.enabled) {
    throw redirect({ to: '/' })
  }
}

const index = createRoute({ getParentRoute: () => root, path: '/', component: OverviewPage })
const banks = createRoute({
  getParentRoute: () => root,
  path: '/banks',
  beforeLoad: requireBanking,
  component: BanksPage,
  validateSearch: validateBanksSearch,
})
const connect = createRoute({
  getParentRoute: () => root,
  path: '/banks/connect',
  beforeLoad: requireBanking,
  component: ConnectBankPage,
  validateSearch: validateConnectSearch,
})
const bank = createRoute({
  getParentRoute: () => root,
  path: '/banks/$connectionId',
  beforeLoad: requireBanking,
  component: BankDetailPage,
})
const transactions = createRoute({
  getParentRoute: () => root,
  path: '/transactions',
  component: TransactionsPage,
  validateSearch: validateTransactionsSearch,
})
const merchant = createRoute({
  getParentRoute: () => root,
  path: '/transactions/merchants/$merchantKey',
  component: MerchantPage,
})
const trips = createRoute({
  getParentRoute: () => root,
  path: '/trips',
  beforeLoad: requireBanking,
  component: TripsPage,
})
const trip = createRoute({
  getParentRoute: () => root,
  path: '/trips/$tripId',
  beforeLoad: requireBanking,
  component: TripPage,
  validateSearch: validateTripSearch,
})
const contracts = createRoute({
  getParentRoute: () => root,
  path: '/contracts',
  beforeLoad: requireBanking,
  component: ContractsPage,
})
const budgets = createRoute({ getParentRoute: () => root, path: '/budgets', component: BudgetsPage })
const review = createRoute({ getParentRoute: () => root, path: '/review', component: ReviewPage })
const income = createRoute({ getParentRoute: () => root, path: '/income', component: IncomePage })
const analytics = createRoute({
  getParentRoute: () => root,
  path: '/analytics',
  component: AnalyticsPage,
  validateSearch: validateAnalyticsSearch,
})
const trends = createRoute({ getParentRoute: () => root, path: '/analytics/trends', component: TrendsPage })
const exportRoute = createRoute({ getParentRoute: () => root, path: '/export', component: ExportPage })
const settings = createRoute({
  getParentRoute: () => root,
  path: '/settings',
  beforeLoad: () => {
    throw redirect({ to: '/settings/sheet' })
  },
})
const sheet = createRoute({
  getParentRoute: () => root,
  path: '/settings/sheet',
  component: () => <SettingsPage section="sheet" />,
})
const columns = createRoute({
  getParentRoute: () => root,
  path: '/settings/columns',
  component: () => <SettingsPage section="columns" />,
})
const rules = createRoute({
  getParentRoute: () => root,
  path: '/settings/rules',
  component: () => <SettingsPage section="rules" />,
})
const backOffice = createRoute({
  getParentRoute: () => root,
  path: '/settings/back-office',
  component: () => <SettingsPage section="back-office" />,
  validateSearch: validateBackOfficeSearch,
})

const routeTree = root.addChildren([
  index,
  banks,
  connect,
  bank,
  transactions,
  merchant,
  trips,
  trip,
  contracts,
  budgets,
  review,
  income,
  analytics,
  trends,
  exportRoute,
  settings,
  sheet,
  columns,
  rules,
  backOffice,
])

export const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

const stringifySearch = (search: Record<string, unknown>) => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, String(item))
    }
  }
  const text = params.toString()

  return text ? `?${text}` : ''
}
const parseSearch = (query: string) => {
  const params = new URLSearchParams(query)
  const out: Record<string, unknown> = {}

  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)

    out[key] = all.length > 1 ? all : all[0]
  }

  return out
}

export const router = createRouter({
  routeTree,
  stringifySearch,
  parseSearch,
  basepath: '/app',
  context: { queryClient },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
