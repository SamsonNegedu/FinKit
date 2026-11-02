import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../shared/database/database.service'
import { ensureColumn } from '../shared/database/migrate'

export interface Budget {
  category: string
  currency: string
  amount: number
  /** Unspent money carries into the next month */
  rollover: boolean
  /** The month ("2026-11") the budget began, which is where carrying over starts counting from */
  startsMonth: string | null
}
export interface Cap {
  currency: string
  amount: number
}

interface BudgetRow {
  category: string
  currency: string
  amount: number
  rollover: number
  starts_month: string | null
}

/**
 * Monthly spending limits per category, and one overall monthly cap per currency. Only the limits are stored: what
 * was spent comes from transactions that can stay in the browser, so the server never needs them to show progress.
 * Every query filters by user_id.
 */
@Injectable()
export class BudgetsRepository {
  private readonly q

  constructor(database: DatabaseService) {
    const { db } = database

    db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount REAL NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, category, currency)
      );
      CREATE TABLE IF NOT EXISTS budget_caps (
        user_id TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount REAL NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, currency)
      );
    `)
    ensureColumn(db, 'budgets', 'rollover', 'INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'budgets', 'starts_month', 'TEXT')
    this.q = {
      list: db.prepare(
        'SELECT category, currency, amount, rollover, starts_month FROM budgets WHERE user_id = ? ORDER BY category',
      ),
      // The start month is kept once set: changing a limit later must not restart the carrying over
      save: db.prepare(
        `INSERT INTO budgets (user_id, category, currency, amount, rollover, starts_month, updated_at) VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(user_id, category, currency) DO UPDATE SET amount = excluded.amount, rollover = excluded.rollover,
           starts_month = COALESCE(budgets.starts_month, excluded.starts_month), updated_at = excluded.updated_at`,
      ),
      remove: db.prepare('DELETE FROM budgets WHERE user_id = ? AND category = ? AND currency = ?'),
      listCaps: db.prepare('SELECT currency, amount FROM budget_caps WHERE user_id = ? ORDER BY currency'),
      saveCap: db.prepare(
        `INSERT INTO budget_caps (user_id, currency, amount, updated_at) VALUES (?,?,?,?)
         ON CONFLICT(user_id, currency) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at`,
      ),
      removeCap: db.prepare('DELETE FROM budget_caps WHERE user_id = ? AND currency = ?'),
    }
  }

  list(userId: string): Budget[] {
    return (this.q.list.all(userId) as BudgetRow[]).map(r => ({
      category: r.category,
      currency: r.currency,
      amount: r.amount,
      rollover: r.rollover === 1,
      startsMonth: r.starts_month,
    }))
  }

  save(userId: string, budget: Budget) {
    this.q.save.run(
      userId,
      budget.category,
      budget.currency,
      budget.amount,
      budget.rollover ? 1 : 0,
      budget.startsMonth,
      new Date().toISOString(),
    )
  }

  remove(userId: string, category: string, currency: string): boolean {
    return this.q.remove.run(userId, category, currency).changes === 1
  }

  caps(userId: string): Cap[] {
    return this.q.listCaps.all(userId) as Cap[]
  }

  saveCap(userId: string, cap: Cap) {
    this.q.saveCap.run(userId, cap.currency, cap.amount, new Date().toISOString())
  }

  removeCap(userId: string, currency: string): boolean {
    return this.q.removeCap.run(userId, currency).changes === 1
  }
}
