/** An icon and a color a person gave a category. Either can be missing: the category's own default is used. */
export interface CategoryStyle {
  icon?: string
  color?: string
}

let styles: Record<string, CategoryStyle> = {}

export function setCategoryStyles(next: Record<string, CategoryStyle> | undefined): void {
  styles = next ?? {}
}

export function getCategoryStyle(category: string | undefined): CategoryStyle | undefined {
  return styles[category || 'Other']
}
