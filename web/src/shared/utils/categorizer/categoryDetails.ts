let details: Record<string, string[]> = {}

export function setCategoryDetails(next: Record<string, string[]> | undefined): void {
  details = next ?? {}
}

/** The subcategories a person made inside a category. */
export function getCategoryDetails(category: string): string[] {
  return details[category] ?? []
}
