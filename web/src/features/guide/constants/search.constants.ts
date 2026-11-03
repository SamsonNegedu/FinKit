export interface GuideSearch {
  /** Which article within the section; defaults to the first. */
  topic?: string
}

export function validateGuideSearch(raw: Record<string, unknown>): GuideSearch {
  const topic = typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : undefined

  return { topic }
}
