import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { BANKING_CONFIG, BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { decrypt, encrypt } from '../shared/crypto/encryption'
import { DatabaseService } from '../shared/database/database.service'
import { ensureColumn, hasColumn } from '../shared/database/migrate'
import { MANUAL_PREFIX, Trip, TripEntry, TripItem } from './trips.types'

interface TripRow {
  id: string
  name: string
  location: string
  start_date: string | null
  end_date: string | null
  budget: number | null
  budget_currency: string | null
  travelers: string | null
  archived: number
}
interface ItemRow {
  tx_ref: string
  trip_id: string
  kind: 'cost' | 'funding'
  category: string | null
  subcategory: string | null
  place: string | null
  shared: number
  paid_by: string | null
}

/**
 * Trips and which transactions belong to them. A synced transaction is only referenced by its opaque
 * ref (see BankTransactionsStore), never copied. What says where someone went and with whom is encrypted
 * like synced transactions: the trip's name, location and travelers, an item's place and who paid, and a manual
 * entry's amount and note. What stays readable is what the database sorts and totals by: dates, kind, categories,
 * the budget and the currency. Every query filters by user_id.
 */
@Injectable()
export class TripsRepository {
  private readonly q
  private readonly key: Buffer

  constructor(database: DatabaseService, @Inject(BANKING_CONFIG) config: BankingConfig) {
    const { db } = database

    this.key = config.encryptionKey
    db.exec(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS trip_items (
        user_id TEXT NOT NULL,
        tx_ref TEXT NOT NULL,
        trip_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        category TEXT,
        PRIMARY KEY (user_id, tx_ref)
      );
      CREATE INDEX IF NOT EXISTS idx_trip_items_trip ON trip_items(user_id, trip_id);
      CREATE TABLE IF NOT EXISTS trip_categories (
        user_id TEXT NOT NULL,
        name_key TEXT NOT NULL,
        name TEXT NOT NULL,
        PRIMARY KEY (user_id, name_key)
      );
      CREATE TABLE IF NOT EXISTS trip_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        trip_id TEXT NOT NULL,
        date TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trip_entries_trip ON trip_entries(user_id, trip_id);
    `)
    // Added after the first release: older databases keep their rows and get the new columns
    ensureColumn(db, 'trips', 'budget', 'REAL')
    ensureColumn(db, 'trips', 'budget_currency', 'TEXT')
    ensureColumn(db, 'trips', 'travelers', 'TEXT')
    ensureColumn(db, 'trips', 'archived', 'INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'trip_items', 'place', 'TEXT')
    ensureColumn(db, 'trip_items', 'shared', 'INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'trip_items', 'paid_by', 'TEXT')
    // Snacks used to be a category of its own; it is now a part of Food & drink. Rows keep their amounts and
    // move over once, when the column is added, so a Snacks category someone makes later is left alone.
    if (!hasColumn(db, 'trip_items', 'subcategory')) {
      ensureColumn(db, 'trip_items', 'subcategory', 'TEXT')
      db.exec(`
        UPDATE trip_items SET category = 'Food & drink', subcategory = 'Snacks' WHERE category = 'Snacks';
        DELETE FROM trip_categories WHERE name_key = 'snacks';
      `)
    }
    this.q = {
      insertTrip: db.prepare(
        `INSERT INTO trips (id, user_id, name, location, start_date, end_date, budget, budget_currency, travelers, archived, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ),
      updateTrip: db.prepare(
        `UPDATE trips SET name = ?, location = ?, start_date = ?, end_date = ?, budget = ?, budget_currency = ?,
         travelers = ?, archived = ? WHERE user_id = ? AND id = ?`,
      ),
      oneTrip: db.prepare('SELECT * FROM trips WHERE user_id = ? AND id = ?'),
      allTrips: db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY COALESCE(start_date, created_at) DESC'),
      deleteTrip: db.prepare('DELETE FROM trips WHERE user_id = ? AND id = ?'),
      freeItems: db.prepare('DELETE FROM trip_items WHERE user_id = ? AND trip_id = ?'),
      freeEntries: db.prepare('DELETE FROM trip_entries WHERE user_id = ? AND trip_id = ?'),
      upsertItem: db.prepare(`
        INSERT INTO trip_items (user_id, tx_ref, trip_id, kind, category, subcategory, place, shared, paid_by)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id, tx_ref) DO UPDATE SET trip_id = excluded.trip_id, kind = excluded.kind,
          category = excluded.category, subcategory = excluded.subcategory, place = excluded.place, shared = excluded.shared, paid_by = excluded.paid_by
      `),
      oneItem: db.prepare('SELECT * FROM trip_items WHERE user_id = ? AND tx_ref = ?'),
      deleteItem: db.prepare('DELETE FROM trip_items WHERE user_id = ? AND trip_id = ? AND tx_ref = ?'),
      itemsOfTrip: db.prepare('SELECT * FROM trip_items WHERE user_id = ? AND trip_id = ?'),
      itemCounts: db.prepare('SELECT trip_id, COUNT(*) AS n FROM trip_items WHERE user_id = ? GROUP BY trip_id'),
      tripByRef: db.prepare('SELECT tx_ref, trip_id FROM trip_items WHERE user_id = ?'),
      insertEntry: db.prepare('INSERT INTO trip_entries (id, user_id, trip_id, date, payload) VALUES (?,?,?,?,?)'),
      entriesOfTrip: db.prepare('SELECT * FROM trip_entries WHERE user_id = ? AND trip_id = ?'),
      deleteEntry: db.prepare('DELETE FROM trip_entries WHERE user_id = ? AND trip_id = ? AND id = ?'),
      categories: db.prepare('SELECT name FROM trip_categories WHERE user_id = ? ORDER BY name_key'),
      insertCategory: db.prepare('INSERT OR IGNORE INTO trip_categories (user_id, name_key, name) VALUES (?,?,?)'),
      deleteCategory: db.prepare('DELETE FROM trip_categories WHERE user_id = ? AND name_key = ?'),
      recategorize: db.prepare(
        'UPDATE trip_items SET category = ?, subcategory = NULL WHERE user_id = ? AND category = ?',
      ),
      usedSubcategories: db.prepare(
        'SELECT DISTINCT category, subcategory FROM trip_items WHERE user_id = ? AND subcategory IS NOT NULL',
      ),
    }
    this.removeTrip = db.transaction((userId: string, id: string) => {
      this.q.freeItems.run(userId, id)
      this.q.freeEntries.run(userId, id)

      return this.q.deleteTrip.run(userId, id).changes
    })
    this.tagMany = db.transaction((userId: string, items: TripItem[]) => {
      for (const i of items) {
        this.q.upsertItem.run(
          userId,
          i.ref,
          i.tripId,
          i.kind,
          i.category,
          i.subcategory,
          this.seal(i.place),
          i.shared ? 1 : 0,
          this.seal(i.paidBy),
        )
      }
    })
    this.untagMany = db.transaction((userId: string, tripId: string, refs: string[]) => {
      for (const ref of refs) {
        this.q.deleteItem.run(userId, tripId, ref)
        if (ref.startsWith(MANUAL_PREFIX)) {
          this.q.deleteEntry.run(userId, tripId, ref.slice(MANUAL_PREFIX.length))
        }
      }
    })
    this.addEntryWithItem = db.transaction((userId: string, entry: TripEntry, item: Omit<TripItem, 'ref'>) => {
      this.q.insertEntry.run(
        entry.id,
        userId,
        entry.tripId,
        entry.date,
        encrypt(JSON.stringify({ amount: entry.amount, currency: entry.currency, note: entry.note }), this.key),
      )
      this.q.upsertItem.run(
        userId,
        MANUAL_PREFIX + entry.id,
        item.tripId,
        item.kind,
        item.category,
        item.subcategory,
        this.seal(item.place),
        item.shared ? 1 : 0,
        this.seal(item.paidBy),
      )
    })
    this.dropCategory = db.transaction((userId: string, key: string, name: string, fallback: string) => {
      this.q.recategorize.run(fallback, userId, name)

      return this.q.deleteCategory.run(userId, key).changes
    })
  }

  private seal(value: string | null): string | null {
    return value === null ? null : encrypt(value, this.key)
  }

  private open(value: string | null): string | null {
    return value === null ? null : decrypt(value, this.key)
  }

  private toTrip(r: TripRow): Trip {
    return {
      id: r.id,
      name: this.open(r.name) ?? '',
      location: this.open(r.location) ?? '',
      startDate: r.start_date,
      endDate: r.end_date,
      budget: r.budget,
      budgetCurrency: r.budget_currency,
      travelers: r.travelers ? (JSON.parse(this.open(r.travelers)!) as string[]) : [],
      archived: r.archived === 1,
    }
  }

  private toItem(r: ItemRow): TripItem {
    return {
      ref: r.tx_ref,
      tripId: r.trip_id,
      kind: r.kind,
      category: r.category,
      subcategory: r.subcategory,
      place: this.open(r.place),
      shared: r.shared === 1,
      paidBy: this.open(r.paid_by),
    }
  }

  private readonly removeTrip: (userId: string, id: string) => number
  private readonly tagMany: (userId: string, items: TripItem[]) => void
  private readonly untagMany: (userId: string, tripId: string, refs: string[]) => void
  private readonly addEntryWithItem: (userId: string, entry: TripEntry, item: Omit<TripItem, 'ref'>) => void
  private readonly dropCategory: (userId: string, key: string, name: string, fallback: string) => number

  create(userId: string, t: Omit<Trip, 'id'>): Trip {
    const id = randomUUID()

    this.q.insertTrip.run(
      id,
      userId,
      this.seal(t.name),
      this.seal(t.location),
      t.startDate,
      t.endDate,
      t.budget,
      t.budgetCurrency,
      this.seal(JSON.stringify(t.travelers)),
      t.archived ? 1 : 0,
      new Date().toISOString(),
    )

    return { id, ...t }
  }

  update(userId: string, t: Trip): void {
    this.q.updateTrip.run(
      this.seal(t.name),
      this.seal(t.location),
      t.startDate,
      t.endDate,
      t.budget,
      t.budgetCurrency,
      this.seal(JSON.stringify(t.travelers)),
      t.archived ? 1 : 0,
      userId,
      t.id,
    )
  }

  find(userId: string, id: string): Trip | undefined {
    const row = this.q.oneTrip.get(userId, id) as TripRow | undefined

    return row && this.toTrip(row)
  }

  list(userId: string): Trip[] {
    return (this.q.allTrips.all(userId) as TripRow[]).map(r => this.toTrip(r))
  }

  /** Deleting a trip frees its synced transactions (they go back to their month) and drops its manual entries. */
  delete(userId: string, id: string): boolean {
    return this.removeTrip(userId, id) > 0
  }

  item(userId: string, ref: string): TripItem | undefined {
    const row = this.q.oneItem.get(userId, ref) as ItemRow | undefined

    return row && this.toItem(row)
  }

  tag(userId: string, items: TripItem[]): void {
    this.tagMany(userId, items)
  }

  untag(userId: string, tripId: string, refs: string[]): void {
    this.untagMany(userId, tripId, refs)
  }

  addEntry(userId: string, entry: Omit<TripEntry, 'id'>, item: Omit<TripItem, 'ref' | 'tripId'>): string {
    const id = randomUUID()

    this.addEntryWithItem(userId, { id, ...entry }, { ...item, tripId: entry.tripId })

    return MANUAL_PREFIX + id
  }

  entries(userId: string, tripId: string): TripEntry[] {
    const rows = this.q.entriesOfTrip.all(userId, tripId) as Array<{ id: string; date: string; payload: string }>

    return rows.map(r => ({
      id: r.id,
      tripId,
      date: r.date,
      ...(JSON.parse(decrypt(r.payload, this.key)) as { amount: number; currency: string; note: string }),
    }))
  }

  items(userId: string, tripId: string): TripItem[] {
    return (this.q.itemsOfTrip.all(userId, tripId) as ItemRow[]).map(r => this.toItem(r))
  }

  counts(userId: string): Map<string, number> {
    const rows = this.q.itemCounts.all(userId) as Array<{ trip_id: string; n: number }>

    return new Map(rows.map(r => [r.trip_id, r.n]))
  }

  tripByRef(userId: string): Map<string, string> {
    const rows = this.q.tripByRef.all(userId) as Array<{ tx_ref: string; trip_id: string }>

    return new Map(rows.map(r => [r.tx_ref, r.trip_id]))
  }

  /** Subcategories this person has used, so ones they typed themselves are offered again. */
  usedSubcategories(userId: string): Array<{ category: string; subcategory: string }> {
    return this.q.usedSubcategories.all(userId) as Array<{ category: string; subcategory: string }>
  }

  customCategories(userId: string): string[] {
    return (this.q.categories.all(userId) as Array<{ name: string }>).map(r => r.name)
  }

  addCategory(userId: string, key: string, name: string): void {
    this.q.insertCategory.run(userId, key, name)
  }

  /** Items using the removed category move to the fallback. Returns whether it existed. */
  removeCategory(userId: string, key: string, name: string, fallback: string): boolean {
    return this.dropCategory(userId, key, name, fallback) > 0
  }
}
