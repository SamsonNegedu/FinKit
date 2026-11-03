import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { statusQuery } from '@/features/banking/hooks/banking-queries'
import {
  validateBackOfficeSearch,
  validateBanksSearch,
  validateConnectSearch,
} from '@/features/banking/constants/search.constants'
import { validateTripSearch } from '@/features/trips/constants/search.constants'
import { ANALYTICS_PATHS, validateAnalyticsSearch } from '@/features/analytics/constants/search.constants'
import { validateTransactionsSearch } from '@/features/transactions/constants/search.constants'
import OverviewPage from '@/features/overview/routes'
import ReviewPage from '@/features/review/routes'
import IncomePage from '@/features/income/routes'
import { validateRulesSearch } from '@/features/settings/constants/search.constants'
import SettingsPage from '@/features/settings/routes'
import { AnalyticsPage } from '@/features/analytics/routes'
import { BanksPage, BankDetailPage, ConnectBankPage } from '@/features/banking/routes'
import TransactionsPage from '@/features/transactions/routes'
import MerchantPage from '@/features/transactions/routes/MerchantPage'
import { TripPage, TripsPage } from '@/features/trips/routes'
import { BudgetsPage } from '@/features/budgets/routes'
import { ContractsPage } from '@/features/contracts/routes'
import { validateGuideSearch } from '@/features/guide/constants/search.constants'
import GuidePage from '@/features/guide/routes/GuidePage'
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
  validateSearch: validateAnalyticsSearch,
  // Before the views had pages of their own they were tabs: /analytics?tab=months
  beforeLoad: ({ search }) => {
    if (search.tab) {
      throw redirect({ to: ANALYTICS_PATHS[search.tab] })
    }
  },
  component: () => <AnalyticsPage section="where" />,
})
const analyticsMonths = createRoute({
  getParentRoute: () => root,
  path: '/analytics/months',
  component: () => <AnalyticsPage section="months" />,
})
const analyticsYear = createRoute({
  getParentRoute: () => root,
  path: '/analytics/year',
  component: () => <AnalyticsPage section="year" />,
})
const analyticsTrend = createRoute({
  getParentRoute: () => root,
  path: '/analytics/trend',
  component: () => <AnalyticsPage section="trend" />,
})
// The old standalone Trends page is the Trend view now
const trends = createRoute({
  getParentRoute: () => root,
  path: '/analytics/trends',
  beforeLoad: () => {
    throw redirect({ to: '/analytics/trend' })
  },
})
// Export became Your year: copy a month or the whole year there
const exportRoute = createRoute({
  getParentRoute: () => root,
  path: '/export',
  beforeLoad: () => {
    throw redirect({ to: '/analytics/year' })
  },
})
const guide = createRoute({
  getParentRoute: () => root,
  path: '/guide',
  beforeLoad: () => {
    throw redirect({ to: '/guide/$sectionId', params: { sectionId: 'start' } })
  },
})
const guideSection = createRoute({
  getParentRoute: () => root,
  path: '/guide/$sectionId',
  component: GuidePage,
  validateSearch: validateGuideSearch,
})
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
const categories = createRoute({
  getParentRoute: () => root,
  path: '/settings/categories',
  component: () => <SettingsPage section="categories" />,
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
  validateSearch: validateRulesSearch,
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
  analyticsMonths,
  analyticsYear,
  analyticsTrend,
  trends,
  exportRoute,
  guide,
  guideSection,
  settings,
  sheet,
  categories,
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
