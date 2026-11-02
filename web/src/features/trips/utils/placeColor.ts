import { getCategoryColor } from '@/shared/utils/categorizer'

/** A place keeps the same color wherever it shows; "Not assigned" is grey. */
export const placeColor = (place: string): string => (place === 'Not assigned' ? '#64748b' : getCategoryColor(place))
