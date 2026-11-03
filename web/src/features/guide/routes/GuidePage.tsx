import { Navigate, useParams, useSearch } from '@tanstack/react-router'
import TabLinks from '@/shared/components/forms/TabLinks'
import PageHeader from '@/shared/components/layout/PageHeader'
import { useBankingStatus } from '@/features/banking/hooks/banking-queries'
import GuideSectionPanel from '@/features/guide/components/GuideSectionPanel'
import type { GuideSearch } from '@/features/guide/constants/search.constants'
import { type GuideSectionId, visibleFeatureGuideSections } from '@/shared/guides/featureGuide'

export default function GuidePage() {
  const { sectionId } = useParams({ from: '/guide/$sectionId' })
  const search = useSearch({ from: '/guide/$sectionId' }) as GuideSearch
  const { data: banking } = useBankingStatus()
  const sections = visibleFeatureGuideSections(!!banking?.enabled)
  const section = sections.find(s => s.id === sectionId)

  if (!section) {
    const fallback = sections[0]?.id ?? 'start'

    return <Navigate to="/guide/$sectionId" params={{ sectionId: fallback }} replace />
  }

  const article = section.articles.find(a => a.id === search.topic) ?? section.articles[0]

  if (!article) {
    return null
  }

  return (
    <div>
      <PageHeader title="Guide" description="How FinKit works, by area. The groups match the sidebar." />
      <TabLinks
        ariaLabel="Guide sections"
        className="mb-6"
        links={sections.map(s => ({
          label: s.title,
          link: { to: '/guide/$sectionId', params: { sectionId: s.id }, search: {} },
          active: s.id === sectionId,
        }))}
      />
      <GuideSectionPanel sectionId={sectionId as GuideSectionId} section={section} article={article} />
    </div>
  )
}
