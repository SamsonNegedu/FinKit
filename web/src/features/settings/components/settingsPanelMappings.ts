import { CategoryMapping } from '@/shared/types'
import { getAvailableCategories } from '@/shared/utils/categorizer'

export function addMappingRow(mappings: CategoryMapping[]): CategoryMapping[] {
  const unmappedCategories = getAvailableCategories().filter(
    c => !mappings.find(m => m.appCategory === c) && c !== 'Transfer' && c !== 'Income',
  )
  if (unmappedCategories.length === 0) {
    return mappings
  }
  return [...mappings, { appCategory: unmappedCategories[0], sheetColumn: '' }]
}

export function updateMappingRow(
  mappings: CategoryMapping[],
  index: number,
  field: 'appCategory' | 'sheetColumn',
  value: string,
): CategoryMapping[] {
  const updated = [...mappings]
  updated[index] = { ...updated[index], [field]: value }
  return updated
}
