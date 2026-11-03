import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import type { BankTransaction } from '../bank-connections/providers/bank-provider'
import { BankTransactionsStore } from '../transactions/bank-transactions.store'
import { TransactionHooks } from '../transactions/transaction-hooks'
import { breakdown, TripLine } from './trips.breakdown'
import { CreateTripInput, EntryInput, TagItemsInput, UpdateTripInput } from './trips.schemas'
import { TripsRepository } from './trips.repository'
import { MANUAL_PREFIX, Trip, TripEntry, TripItem } from './trips.types'

// Built in, so they exist for everyone and can't be removed. They are not the app's spending
// categories and are never written to a sheet.
const DEFAULT_TRIP_CATEGORIES = [
  'Accommodation',
  'Transport',
  'Food & drink',
  'Activities',
  'Shopping',
  'Souvenir',
  'Other',
]
// Suggestions that come with a category. They are offered, never required, and a person can type their own.
const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Accommodation: ['Hotel', 'Hostel', 'Apartment', 'Campsite'],
  Transport: ['Flight', 'Train', 'Bus', 'Metro & tram', 'Taxi & rides', 'Car hire', 'Ferry', 'Fuel & parking'],
  'Food & drink': ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee', 'Drinks', 'Groceries'],
  Activities: ['Tours', 'Tickets', 'Nightlife'],
}
const FALLBACK = 'Other'
const keyOf = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim()

/** A manual entry shown like a bank transaction, so totals and lists treat both the same way. */
const asTransaction = (e: TripEntry): BankTransaction => ({
  date: e.date,
  description: e.note,
  amount: -e.amount,
  currency: e.currency,
  rawData: {},
})

@Injectable()
export class TripsService implements OnModuleInit {
  constructor(
    private readonly trips: TripsRepository,
    private readonly txs: BankTransactionsStore,
    private readonly hooks: TransactionHooks,
  ) {}

  /** Every stored transaction listed carries the trip it is in (or null), so the app can keep it out of the months. */
  onModuleInit() {
    this.hooks.decorate(userId => {
      const tripOf = this.trips.tripByRef(userId)

      return ref => ({ tripId: tripOf.get(ref) ?? null })
    })
  }

  list(userId: string) {
    const counts = this.trips.counts(userId)

    return this.trips.list(userId).map(t => ({
      ...t,
      transactionCount: counts.get(t.id) ?? 0,
      // Only the money figures: enough for a card on the list without sending every breakdown
      totals: breakdown(this.linesOf(userId, t.id), t).map(({ currency, funded, spent, remaining, mine }) => ({
        currency,
        funded,
        spent,
        remaining,
        mine,
      })),
    }))
  }

  create(userId: string, input: CreateTripInput) {
    return this.trips.create(userId, {
      name: input.name,
      location: input.location,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? null,
      budgetCurrency: input.budget ? (input.budgetCurrency ?? null) : null,
      travelers: input.travelers ?? [],
      archived: false,
    })
  }

  update(userId: string, id: string, input: UpdateTripInput) {
    const current = this.require(userId, id)
    const next: Trip = {
      ...current,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.budgetCurrency !== undefined && { budgetCurrency: input.budgetCurrency }),
      ...(input.travelers !== undefined && { travelers: input.travelers }),
      ...(input.archived !== undefined && { archived: input.archived }),
    }

    if (next.startDate && next.endDate && next.endDate < next.startDate) {
      throw new BadRequestException({ error: 'endDate is before startDate' })
    }
    if (!next.budget) {
      next.budget = null
      next.budgetCurrency = null
    }
    this.trips.update(userId, next)

    return next
  }

  delete(userId: string, id: string) {
    if (!this.trips.delete(userId, id)) {
      throw new NotFoundException({ error: 'Trip not found' })
    }
  }

  /** The trip, what is in it, and where the money went. */
  detail(userId: string, id: string) {
    const trip = this.require(userId, id)
    const items = this.trips.items(userId, id)
    const lines = this.linesOf(userId, id)

    return {
      trip,
      transactions: lines
        .map(l => ({
          ...l.tx,
          ref: l.ref,
          kind: l.kind,
          tripCategory: l.category,
          tripSubcategory: l.subcategory,
          place: l.place,
          shared: l.shared,
          paidBy: l.paidBy,
          manual: l.manual,
        }))
        .toSorted((a, b) => b.date.localeCompare(a.date)),
      // Rows the bank data no longer has (for example after the person erased their stored transactions)
      missing: items.length - lines.length,
      totals: breakdown(lines, trip),
    }
  }

  /** The trip's items joined with their transactions; rows the bank data no longer has are left out. */
  private linesOf(userId: string, id: string): Array<TripLine & { manual: boolean }> {
    const items = this.trips.items(userId, id)
    const entries = new Map(this.trips.entries(userId, id).map(e => [MANUAL_PREFIX + e.id, e]))
    const found = this.txs.findByRefs(
      userId,
      items.filter(i => !entries.has(i.ref)).map(i => i.ref),
    )

    return items.flatMap(i => {
      const entry = entries.get(i.ref)
      const tx = entry ? asTransaction(entry) : found.get(i.ref)

      return tx ? [{ ...i, tx, manual: !!entry }] : []
    })
  }

  /** Adds transactions to the trip, or changes how they count. One in another trip moves here. */
  tag(userId: string, id: string, input: TagItemsInput) {
    const trip = this.require(userId, id)
    const known = this.categories(userId)
    const manual = new Set(this.trips.entries(userId, id).map(e => MANUAL_PREFIX + e.id))
    const bank = input.items.filter(i => !i.ref.startsWith(MANUAL_PREFIX))
    const found = this.txs.findByRefs(
      userId,
      bank.map(i => i.ref),
    )
    const missing = input.items.filter(i => (i.ref.startsWith(MANUAL_PREFIX) ? !manual.has(i.ref) : !found.has(i.ref)))

    if (missing.length) {
      throw new BadRequestException({ error: 'Some transactions were not found', refs: missing.map(i => i.ref) })
    }
    const items = input.items.map(i => {
      const before = this.trips.item(userId, i.ref)
      // Only what the request names changes; the rest stays as it was in this trip
      const same = before?.tripId === id ? before : undefined
      const kind = i.kind

      return this.merge(userId, trip, known, i, kind, same, i.ref.startsWith(MANUAL_PREFIX))
    })

    this.trips.tag(userId, items)
  }

  addEntry(userId: string, id: string, input: EntryInput) {
    const trip = this.require(userId, id)
    const known = this.categories(userId)
    const category = known.find(c => keyOf(c) === keyOf(input.category))

    if (!category) {
      throw new BadRequestException({ error: `Unknown trip category: ${input.category}` })
    }
    this.checkPayer(trip, input.paidBy)

    return {
      ref: this.trips.addEntry(
        userId,
        { tripId: id, date: input.date, amount: input.amount, currency: input.currency, note: input.note },
        {
          kind: 'cost',
          category,
          subcategory: this.subcategoryOf(userId, category, input.subcategory),
          place: input.place ?? null,
          shared: input.shared ?? false,
          paidBy: input.paidBy ?? null,
        },
      ),
    }
  }

  untag(userId: string, id: string, refs: string[]) {
    this.require(userId, id)
    this.trips.untag(userId, id, refs)
  }

  categories(userId: string): string[] {
    // A category someone made themselves before it became built in would otherwise be listed twice
    const custom = this.trips
      .customCategories(userId)
      .filter(c => !DEFAULT_TRIP_CATEGORIES.some(d => keyOf(d) === keyOf(c)))

    return [...DEFAULT_TRIP_CATEGORIES, ...custom]
  }

  /** Per category: the built-in suggestions, then any the person typed themselves. */
  subcategories(userId: string): Record<string, string[]> {
    const out: Record<string, string[]> = {}

    for (const [category, names] of Object.entries(DEFAULT_SUBCATEGORIES)) {
      out[category] = [...names]
    }
    for (const { category, subcategory } of this.trips.usedSubcategories(userId)) {
      const list = (out[category] ??= [])

      if (!list.some(s => keyOf(s) === keyOf(subcategory))) {
        list.push(subcategory)
      }
    }

    return out
  }

  addCategory(userId: string, name: string) {
    if (this.categories(userId).some(c => keyOf(c) === keyOf(name))) {
      throw new BadRequestException({ error: 'That category already exists' })
    }
    this.trips.addCategory(userId, keyOf(name), name)
  }

  removeCategory(userId: string, name: string) {
    if (DEFAULT_TRIP_CATEGORIES.some(c => keyOf(c) === keyOf(name))) {
      throw new BadRequestException({ error: 'Built-in categories cannot be removed' })
    }
    const stored = this.trips.customCategories(userId).find(c => keyOf(c) === keyOf(name))

    if (!stored || !this.trips.removeCategory(userId, keyOf(stored), stored, FALLBACK)) {
      throw new NotFoundException({ error: 'Category not found' })
    }
  }

  private merge(
    userId: string,
    trip: Trip,
    known: string[],
    input: TagItemsInput['items'][number],
    kind: TripItem['kind'],
    before: TripItem | undefined,
    manual: boolean,
  ): TripItem {
    const wanted = input.category ?? before?.category ?? FALLBACK
    const category = kind === 'funding' ? null : (known.find(c => keyOf(c) === keyOf(wanted)) ?? null)

    if (kind === 'cost' && !category) {
      throw new BadRequestException({ error: `Unknown trip category: ${input.category}` })
    }
    // Only manual entries can be paid by someone else: a bank transaction left your own account
    const paidBy =
      manual && kind === 'cost' ? (input.paidBy !== undefined ? input.paidBy : (before?.paidBy ?? null)) : null

    this.checkPayer(trip, paidBy)
    // A subcategory belongs to its category, so moving to another category clears it unless a new one is given
    const kept = category && before?.category === category ? before.subcategory : null

    return {
      ref: input.ref,
      tripId: trip.id,
      kind,
      category,
      subcategory:
        kind === 'funding' || !category
          ? null
          : input.subcategory !== undefined
            ? this.subcategoryOf(userId, category, input.subcategory)
            : kept,
      place: kind === 'funding' ? null : input.place !== undefined ? input.place : (before?.place ?? null),
      shared: kind === 'funding' ? false : (input.shared ?? before?.shared ?? false),
      paidBy,
    }
  }

  /** The known spelling when it matches one (so "flight" and "Flight" are one), otherwise what was typed. */
  private subcategoryOf(userId: string, category: string, wanted: string | null | undefined): string | null {
    const name = wanted?.trim()

    if (!name) {
      return null
    }
    const known = this.subcategories(userId)[category] ?? []

    return known.find(s => keyOf(s) === keyOf(name)) ?? name
  }

  private checkPayer(trip: Trip, paidBy: string | null | undefined) {
    if (paidBy && !trip.travelers.includes(paidBy)) {
      throw new BadRequestException({ error: `${paidBy} is not a traveler on this trip` })
    }
  }

  private require(userId: string, id: string) {
    const trip = this.trips.find(userId, id)

    if (!trip) {
      throw new NotFoundException({ error: 'Trip not found' })
    }

    return trip
  }
}
