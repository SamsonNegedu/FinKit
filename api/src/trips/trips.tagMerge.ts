import { BadRequestException } from '@nestjs/common'
import type { TagItemsInput } from './trips.schemas'
import { FALLBACK, keyOf } from './trips.constants'
import type { Trip, TripItem } from './trips.types'

export function mergeTagItem(input: {
  userId: string
  trip: Trip
  known: string[]
  row: TagItemsInput['items'][number]
  kind: TripItem['kind']
  before: TripItem | undefined
  manual: boolean
  subcategoryOf: (userId: string, category: string, wanted: string | null | undefined) => string | null
}): TripItem {
  const { userId, trip, known, row, kind, before, manual, subcategoryOf } = input
  const wanted = row.category ?? before?.category ?? FALLBACK
  const category = kind === 'funding' ? null : (known.find(c => keyOf(c) === keyOf(wanted)) ?? null)

  if (kind === 'cost' && !category) {
    throw new BadRequestException({ error: `Unknown trip category: ${row.category}` })
  }
  const paidBy = resolvePaidBy(manual, kind, row, before)

  assertTravelerPayer(trip, paidBy)
  const kept = category && before?.category === category ? before.subcategory : null

  return {
    ref: row.ref,
    tripId: trip.id,
    kind,
    category,
    subcategory: resolveSubcategory(userId, kind, category, row, kept, subcategoryOf),
    place: resolvePlace(kind, row, before),
    shared: kind === 'funding' ? false : (row.shared ?? before?.shared ?? false),
    paidBy,
  }
}

function resolvePaidBy(
  manual: boolean,
  kind: TripItem['kind'],
  row: TagItemsInput['items'][number],
  before: TripItem | undefined,
): string | null {
  if (!manual || kind !== 'cost') {
    return null
  }
  if (row.paidBy !== undefined) {
    return row.paidBy
  }

  return before?.paidBy ?? null
}

function resolvePlace(
  kind: TripItem['kind'],
  row: TagItemsInput['items'][number],
  before: TripItem | undefined,
): string | null {
  if (kind === 'funding') {
    return null
  }
  if (row.place !== undefined) {
    return row.place
  }

  return before?.place ?? null
}

function resolveSubcategory(
  userId: string,
  kind: TripItem['kind'],
  category: string | null,
  row: TagItemsInput['items'][number],
  kept: string | null,
  subcategoryOf: (userId: string, category: string, wanted: string | null | undefined) => string | null,
): string | null {
  if (kind === 'funding' || !category) {
    return null
  }
  if (row.subcategory !== undefined) {
    return subcategoryOf(userId, category, row.subcategory)
  }

  return kept
}

export function assertTravelerPayer(trip: Trip, paidBy: string | null | undefined) {
  if (paidBy && !trip.travelers.includes(paidBy)) {
    throw new BadRequestException({ error: `${paidBy} is not a traveler on this trip` })
  }
}
