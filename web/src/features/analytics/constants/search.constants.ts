export const ANALYTICS_TABS = ['where', 'months', 'trend'] as const
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

/** The first tab carries no param, so the plain /analytics link stays the canonical one. */
export interface AnalyticsSearch {
  tab?: Exclude<AnalyticsTab, 'where'>
}

export const validateAnalyticsSearch = (s: Record<string, unknown>): AnalyticsSearch => ({
  tab: s.tab === 'months' || s.tab === 'trend' ? s.tab : undefined,
})
