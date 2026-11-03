import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { FeatureGuideArticle, FeatureGuideSection, GuideSectionId } from '@/shared/guides/featureGuide'

const TOPIC_LINK =
  'block rounded-lg px-3 py-2 text-left text-sm text-midnight-300 hover:bg-midnight-800 hover:text-white outline-none focus-visible:text-white'

/**
 * One group of the guide: what the group is for, a list of its topics, and the open article. Laid out flat on the
 * page like the rest of the app, with a line between the list and the article.
 */
export default function GuideSectionPanel({
  sectionId,
  section,
  article,
}: {
  sectionId: GuideSectionId
  section: FeatureGuideSection
  article: FeatureGuideArticle
}) {
  const index = section.articles.findIndex(a => a.id === article.id)
  const next = section.articles[index + 1]

  return (
    <div>
      <p className="mb-5 max-w-2xl text-sm text-midnight-300">{section.description}</p>
      <div className="flex flex-col gap-6 md:flex-row md:gap-0">
        {section.articles.length > 1 && (
          <nav
            aria-label={`${section.title} topics`}
            className="shrink-0 md:w-56 md:border-r md:border-midnight-800 md:pr-4"
          >
            <ul className="flex gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
              {section.articles.map(item => (
                <li key={item.id} className="shrink-0 md:shrink">
                  <Link
                    to="/guide/$sectionId"
                    params={{ sectionId }}
                    search={{ topic: item.id }}
                    aria-current={item.id === article.id ? 'page' : undefined}
                    className={`${TOPIC_LINK} ${item.id === article.id ? 'bg-midnight-800 font-medium text-white' : ''}`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <article className={`min-w-0 max-w-2xl flex-1 ${section.articles.length > 1 ? 'md:pl-8' : ''}`}>
          <h2 className="text-xl font-semibold text-white">{article.title}</h2>
          <p className="mt-1 text-midnight-300">{article.summary}</p>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-midnight-200">
            {article.tips.map(tip => (
              <li key={tip} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-midnight-800 pt-4">
            {article.to && article.linkLabel ? (
              <Link
                to={article.to}
                search={article.search as never}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                {article.linkLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to="/guide/$sectionId"
                params={{ sectionId }}
                search={{ topic: next.id }}
                className="text-sm text-midnight-300 hover:text-white"
              >
                Next: {next.title} →
              </Link>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
