import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import type { BankTransaction } from '../bank-connections/providers/bank-provider'
import { BankTransactionsStore } from '../transactions/bank-transactions.store'
import { TransactionHooks } from '../transactions/transaction-hooks'
import { MerchantRulesService } from '../merchant-rules/merchant-rules.service'
import { SettingsService } from '../settings/settings.service'
import { FALLBACK, suggestCategory } from './contracts.category'
import { merchantName, normalizeMerchant, referencesOf } from './merchant-key'
import { detectContracts, isActive, monthlyEquivalent, nextDue, summarize } from './contracts.detector'
import { ContractRow, ContractsRepository } from './contracts.repository'
import type { CreateContractInput, CreateFromPaymentsInput, UpdateContractInput } from './contracts.schemas'
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

type Payment = ReturnType<typeof toPayment>

interface Context {
  today: string
  available: ReadonlySet<string>
  /** Normalized merchant → the category the person gave it */
  rules: ReadonlyMap<string, string>
  /** Payments behind each contract the person made from selected payments, by contract id */
  linked: ReadonlyMap<string, Payment[]>
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
    const covers = coverage(this.repo.list(userId))

    if (this.worked.get(userId) !== signature) {
      for (const found of detectContracts(this.txs.listWithRefs(userId).map(r => ({ ...r.tx, ref: r.ref })))) {
        if (!covers(found.key, found.detected)) {
          this.repo.saveDetected(userId, found.key, found.currency, found.detected)
        }
      }
      this.worked.set(userId, signature)
    }
    const rows = this.repo.list(userId)
    const ctx = this.context(userId, rows, today)
    const contracts = rows
      // A payee the person added by hand is shown as their contract, not also as a found one
      .filter(r => r.state === 'manual' || !r.detected || !covers(r.detected.name, r.detected))
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

    if (row.user.linked) {
      return {
        payments: (this.linkedPayments(userId, [row]).get(id) ?? []).toSorted((a, b) => b.date.localeCompare(a.date)),
      }
    }
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
    const all = this.txs.listWithRefs(userId)
    const references = referencesOf(all.map(r => r.tx))

    return {
      payments: all
        .filter(({ tx }) => valid(tx) && normalizeMerchant(merchantName(tx, references)) === key)
        .map(({ ref, tx }) => toPayment(ref, tx)),
    }
  }

  /**
   * A contract the person made from payments they selected, for what detection misses (a bill whose text keeps
   * changing). The payments are linked to it, so it has a history and a next due date, and later payments to the
   * same payee join it.
   */
  createFromPayments(userId: string, input: CreateFromPaymentsInput) {
    this.requireCategory(userId, input.group)
    const refs = [...new Set(input.refs)]
    // Scoped to this person: a ref that is unknown or someone else's is simply not found
    const found = this.txs.findByRefs(userId, refs)
    const picked = refs.flatMap(ref => (found.has(ref) ? [{ ref, tx: found.get(ref)! }] : []))

    if (picked.length !== refs.length || picked.some(({ tx }) => tx.amount >= 0)) {
      throw new BadRequestException({ error: 'Only payments you have made can be added' })
    }
    const currencies = new Set(picked.map(({ tx }) => tx.currency))

    if (currencies.size !== 1) {
      throw new BadRequestException({ error: 'The payments must all be in one currency' })
    }
    const references = referencesOf(this.txs.listWithRefs(userId).map(r => r.tx))
    const id = this.repo.createManual(userId, [...currencies][0], {
      name: input.name,
      group: input.group,
      note: input.note,
      linked: { refs, payee: commonPayee(picked.map(({ tx }) => normalizeMerchant(merchantName(tx, references)))) },
      manual: { amount: input.amount, frequency: input.frequency, kind: input.kind, startDate: null },
    })

    return this.one(userId, id)
  }

  /** The payments behind contracts made from selected ones: those picked, and later ones to the same payee. */
  private linkedPayments(userId: string, rows: ContractRow[]) {
    const out = new Map<string, Payment[]>()
    const linked = rows.filter(r => r.user.linked)

    if (linked.length === 0) {
      return out
    }
    const all = this.txs.listWithRefs(userId)
    const references = referencesOf(all.map(r => r.tx))
    const payees = all.map(({ tx }) => normalizeMerchant(merchantName(tx, references)))

    for (const row of linked) {
      const { refs, payee, excluded = [] } = row.user.linked!
      const picked = new Set(refs)
      const removed = new Set(excluded)

      out.set(
        row.id,
        all.flatMap(({ ref, tx }, i) =>
          tx.amount < 0 &&
          tx.currency === row.currency &&
          !removed.has(ref) &&
          (picked.has(ref) || (payee !== '' && payees[i] === payee))
            ? [toPayment(ref, tx)]
            : [],
        ),
      )
    }

    return out
  }

  private context(userId: string, rows: ContractRow[], today: string): Context {
    return {
      today,
      available: this.categories(userId),
      rules: new Map(this.rules.list(userId).map(r => [r.merchant, r.category])),
      linked: this.linkedPayments(userId, rows),
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
    if (row.state === 'manual' && user.manual) {
      user.manual = {
        ...user.manual,
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.frequency ? { frequency: input.frequency } : {}),
        ...(input.kind ? { kind: input.kind } : {}),
      }
    }
    if (user.linked && input.unlink?.length) {
      const gone = new Set(input.unlink)

      user.linked = {
        ...user.linked,
        refs: user.linked.refs.filter(ref => !gone.has(ref)),
        excluded: [...new Set([...(user.linked.excluded ?? []), ...gone])],
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
    const row = this.require(userId, id)

    return this.view(row, this.context(userId, [row], new Date().toISOString().slice(0, 10)))
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

  /** What detection would have recorded, worked out from the payments linked to a contract. */
  private fromLinked(row: ContractRow, ctx: Context): Detected | null {
    const payments = ctx.linked.get(row.id)
    const m = row.user.manual

    if (!m || !payments || payments.length === 0) {
      return null
    }

    return {
      name: row.user.name ?? 'Contract',
      sample: '',
      kind: m.kind,
      frequency: m.frequency,
      amount: m.amount,
      ...summarize(payments, m.frequency, m.kind),
    }
  }

  private view(row: ContractRow, ctx: Context): ContractView | null {
    const m = row.user.manual
    const d = row.detected ?? this.fromLinked(row, ctx)

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
      linked: !!row.user.linked,
      kmPerYear,
      costPerKm: kmPerYear ? round2((monthly * 12) / kmPerYear) : null,
      foundAt: row.createdAt,
      isNew: false,
    }
  }
}

/** The most common payee among the picked payments; empty if none of them has a usable name. */
function commonPayee(payees: string[]): string {
  const counts = new Map<string, number>()

  for (const payee of payees.filter(name => name.length >= 2)) {
    counts.set(payee, (counts.get(payee) ?? 0) + 1)
  }

  return [...counts].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

/**
 * Whether a found contract is one the person already added from their own picks: the same payee, or any of the
 * same payments.
 */
function coverage(rows: ContractRow[]) {
  const linked = rows.flatMap(r => (r.user.linked ? [r.user.linked] : []))
  const payees = new Set(linked.map(l => l.payee).filter(p => p !== ''))
  const refs = new Set(linked.flatMap(l => l.refs))

  return (key: string, d: Detected) =>
    payees.has(normalizeMerchant(key)) ||
    payees.has(normalizeMerchant(d.name)) ||
    (d.refs ?? []).some(ref => refs.has(ref))
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
