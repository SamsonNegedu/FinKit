import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import type { BankTransaction } from '../bank-connections/providers/bank-provider'
import { BankTransactionsStore } from '../transactions/bank-transactions.store'
import { TransactionHooks } from '../transactions/transaction-hooks'
import { MerchantRulesService } from '../merchant-rules/merchant-rules.service'
import { SettingsService } from '../settings/settings.service'
import { FALLBACK, suggestCategory } from './contracts.category'
import { merchantName, normalizeMerchant } from './merchant-key'
import { detectContracts, isActive, monthlyEquivalent, nextDue } from './contracts.detector'
import { ContractRow, ContractsRepository } from './contracts.repository'
import type { CreateContractInput, UpdateContractInput } from './contracts.schemas'
import type { ContractView, Detected, Frequency, Kind, UserData } from './contracts.types'

const round2 = (n: number) => Math.round(n * 100) / 100
const DAY = 86_400_000
const NEW_WITHIN_DAYS = 14

const toPayment = (ref: string, tx: BankTransaction) => ({
  ref,
  date: tx.date,
  amount: round2(-tx.amount),
  description: tx.description,
})

interface Context {
  today: string
  available: ReadonlySet<string>
  /** Normalized merchant → the category the person gave it */
  rules: ReadonlyMap<string, string>
}

@Injectable()
export class ContractsService implements OnModuleInit {
  /** The transactions each person's contracts were last worked out from; detection only reruns when they change. */
  private readonly worked = new Map<string, string>()

  constructor(
    private readonly repo: ContractsRepository,
    private readonly txs: BankTransactionsStore,
    private readonly rules: MerchantRulesService,
    private readonly settings: SettingsService,
    private readonly hooks: TransactionHooks,
  ) {}

  /** What was found in a person's transactions goes with them when those are erased, and is worked out afresh later. */
  onModuleInit() {
    this.hooks.onErased(userId => {
      this.repo.deleteDetected(userId)
      this.worked.delete(userId)
    })
  }

  /**
   * The categories this person can file a contract under: their own list (archived ones too, since an old contract
   * may still sit in one) or else their sheet's, plus the ones that are money set aside.
   */
  categories(userId: string): Set<string> {
    const stored = this.settings.categories(userId)
    const own = stored
      ? [...stored.active, ...stored.archived]
      : this.settings.sheetConfig(userId).categoryMappings.map(m => m.appCategory)

    return new Set([...own, 'Savings', 'Investment'])
  }

  /** Looks for contracts in the person's synced payments, then returns every contract with totals. */
  list(userId: string, today = new Date().toISOString().slice(0, 10)) {
    const signature = this.txs.signature(userId)

    if (this.worked.get(userId) !== signature) {
      for (const found of detectContracts(this.txs.listWithRefs(userId).map(r => ({ ...r.tx, ref: r.ref })))) {
        this.repo.saveDetected(userId, found.key, found.currency, found.detected)
      }
      this.worked.set(userId, signature)
    }
    const ctx: Context = {
      today,
      available: this.categories(userId),
      rules: new Map(this.rules.list(userId).map(r => [r.merchant, r.category])),
    }
    const contracts = this.repo
      .list(userId)
      .map(r => this.view(r, ctx))
      .filter((c): c is ContractView => c !== null)
      .toSorted((a, b) => b.monthly - a.monthly)
    // The very first batch is everything found at once, not news: only later arrivals count as new
    const first = contracts.reduce((min, c) => (c.foundAt && c.foundAt < min ? c.foundAt : min), '9999')
    const cutoff = new Date(new Date(today).getTime() - NEW_WITHIN_DAYS * DAY).toISOString()

    for (const c of contracts) {
      c.isNew = !!c.foundAt && c.foundAt > new Date(new Date(first).getTime() + DAY).toISOString() && c.foundAt > cutoff
    }

    return { contracts, totals: totals(contracts) }
  }

  /** The payments a contract was found from, newest first: so its amounts can be checked, not just trusted. */
  payments(userId: string, id: string) {
    const row = this.require(userId, id)
    const d = row.detected

    if (!d) {
      return { payments: [] }
    }
    const valid = (tx: BankTransaction) => tx.amount < 0 && tx.currency === row.currency

    // Found since refs were kept: read exactly those payments instead of every transaction the person has
    if (d.refs && d.refs.length > 0) {
      const found = this.txs.findByRefs(userId, d.refs)

      return {
        payments: d.refs
          .flatMap(ref => (found.has(ref) && valid(found.get(ref)!) ? [toPayment(ref, found.get(ref)!)] : []))
          .toSorted((a, b) => b.date.localeCompare(a.date)),
      }
    }
    const key = normalizeMerchant(d.name)

    return {
      payments: this.txs
        .listWithRefs(userId)
        .filter(({ tx }) => valid(tx) && normalizeMerchant(merchantName(tx)) === key)
        .map(({ ref, tx }) => toPayment(ref, tx)),
    }
  }

  create(userId: string, input: CreateContractInput) {
    this.requireCategory(userId, input.group)
    const id = this.repo.createManual(userId, input.currency, {
      name: input.name,
      group: input.group,
      note: input.note,
      kmPerYear: input.kmPerYear,
      manual: {
        amount: input.amount,
        frequency: input.frequency,
        kind: input.kind,
        startDate: input.startDate ?? null,
      },
    })

    return this.one(userId, id)
  }

  update(userId: string, id: string, input: UpdateContractInput) {
    const row = this.require(userId, id)
    const user: UserData = { ...row.user }

    if (typeof input.group === 'string') {
      this.requireCategory(userId, input.group)
      if (row.state !== 'manual') {
        // The category is the person's word about the payee, so it is kept as a merchant rule: the payee's
        // transactions and any later contract with it then follow, and it is asked once only
        this.rules.learn(userId, row.detected?.name ?? '', input.group)
        delete input.group
      }
    }
    // null clears what the person set, so the detected value shows again
    for (const field of ['name', 'group', 'note', 'kmPerYear'] as const) {
      if (input[field] === null) {
        delete user[field]
      } else if (input[field] !== undefined) {
        Object.assign(user, { [field]: input[field] })
      }
    }
    // A manual contract stays manual: it has no payments that could be detected again
    const state = row.state === 'manual' ? 'manual' : (input.state ?? row.state)

    this.repo.saveUser(userId, id, state, user)

    return this.one(userId, id)
  }

  remove(userId: string, id: string) {
    this.require(userId, id)
    if (!this.repo.removeManual(userId, id)) {
      throw new NotFoundException({ error: 'Only contracts you added can be deleted; dismiss a detected one' })
    }
  }

  private require(userId: string, id: string) {
    const row = this.repo.get(userId, id)

    if (!row) {
      throw new NotFoundException({ error: 'Not found' })
    }

    return row
  }

  private requireCategory(userId: string, group: string) {
    if (!this.categories(userId).has(group)) {
      throw new BadRequestException({ error: 'Unknown category' })
    }
  }

  private one(userId: string, id: string) {
    return this.view(this.require(userId, id), {
      today: new Date().toISOString().slice(0, 10),
      available: this.categories(userId),
      rules: new Map(this.rules.list(userId).map(r => [r.merchant, r.category])),
    })
  }

  /** The person's own word first, then their merchant rules, then a guess, then Other. */
  private groupOf(
    row: ContractRow,
    d: Detected | null,
    frequency: Frequency,
    amount: number,
    kind: Kind,
    ctx: Context,
  ) {
    if (row.user.group) {
      return { group: row.user.group, groupSource: 'you' as const }
    }
    const rule = d ? ctx.rules.get(normalizeMerchant(d.name)) : undefined

    if (rule) {
      return { group: rule, groupSource: 'rule' as const }
    }
    const guess = suggestCategory({
      text: `${d?.name ?? row.user.name ?? ''} ${d?.sample ?? ''}`,
      kind,
      frequency,
      amount,
      available: ctx.available,
    })

    return guess
      ? { group: guess.category, groupSource: 'suggested' as const }
      : { group: FALLBACK, groupSource: 'none' as const }
  }

  private view(row: ContractRow, ctx: Context): ContractView | null {
    const d: Detected | null = row.detected
    const m = row.user.manual

    if (!d && !m) {
      return null
    }
    const frequency = m?.frequency ?? d!.frequency
    const amount = m?.amount ?? d!.amount
    const kind = m?.kind ?? d!.kind
    const monthly = monthlyEquivalent(amount, frequency)
    const kmPerYear = row.user.kmPerYear ?? null

    return {
      id: row.id,
      state: row.state,
      currency: row.currency,
      name: row.user.name ?? d?.name ?? 'Contract',
      payee: d?.name ?? null,
      ...this.groupOf(row, d, frequency, amount, kind, ctx),
      kind,
      frequency,
      amount,
      monthly,
      lastAmount: d?.lastAmount ?? null,
      firstDate: d?.firstDate ?? m?.startDate ?? null,
      lastDate: d?.lastDate ?? null,
      nextExpected: d?.nextExpected ?? (m?.startDate ? nextDue(m.startDate, frequency, ctx.today) : null),
      count: d?.count ?? 0,
      active: d ? isActive(d.lastDate, frequency, ctx.today) : true,
      priceChange: d?.priceChange ?? null,
      note: row.user.note ?? null,
      kmPerYear,
      costPerKm: kmPerYear ? round2((monthly * 12) / kmPerYear) : null,
      foundAt: row.createdAt,
      isNew: false,
    }
  }
}

/** Monthly cost of what is still running, per currency: nothing is converted between currencies. */
function totals(contracts: ContractView[]) {
  const live = contracts.filter(c => c.state !== 'dismissed' && c.active)
  const out = new Map<
    string,
    { currency: string; monthly: number; fixed: number; variable: number; byGroup: Record<string, number> }
  >()

  for (const c of live) {
    const t = out.get(c.currency) ?? { currency: c.currency, monthly: 0, fixed: 0, variable: 0, byGroup: {} }

    t.monthly = round2(t.monthly + c.monthly)
    t[c.kind] = round2(t[c.kind] + c.monthly)
    t.byGroup[c.group] = round2((t.byGroup[c.group] ?? 0) + c.monthly)
    out.set(c.currency, t)
  }

  return [...out.values()].toSorted((a, b) => b.monthly - a.monthly)
}
