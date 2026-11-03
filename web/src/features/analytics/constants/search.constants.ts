export const ANALYTICS_SECTIONS = ['year', 'where', 'months', 'trend'] as const
export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[number]

/** Where each section lives. The first is the plain /analytics link. */
export const ANALYTICS_PATHS = {
  where: '/analytics',
  months: '/analytics/months',
  year: '/analytics/year',
  trend: '/analytics/trend',
} as const satisfies Record<AnalyticsSection, string>

/**
 * Sections used to be tabs on one page (/analytics?tab=months). Old links keep working: the page sends them to
 * the section's own address.
 */
export interface LegacyAnalyticsSearch {
  tab?: 'months' | 'trend'
}

export const validateAnalyticsSearch = (s: Record<string, unknown>): LegacyAnalyticsSearch => ({
  tab: s.tab === 'months' || s.tab === 'trend' ? s.tab : undefined,
})
