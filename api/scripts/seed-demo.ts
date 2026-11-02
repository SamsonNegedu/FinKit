// Fills the local database with about two years of believable payments, so the Contracts page has
// something to show: rent, electricity, gym, investments, public transport, insurance, subscriptions,
// one ended contract, and everyday spending that must NOT be mistaken for a contract.
//
//   npm run seed:demo            add (safe to repeat: rows are recognised and skipped)
//   npm run seed:demo -- --remove  take the demo rows out again
//
// Everything is stored under the connection id "demo-seed" for dev@localhost, through the same stores
// the app uses, so it is encrypted exactly like synced data.
import { loadLocalEnv } from '../src/load-env'
import { loadBankingConfig } from '../src/bank-connections/config/banking.config'
import { BankTransactionsStore } from '../src/bank-connections/transactions/bank-transactions.store'
import type { BankTransaction } from '../src/bank-connections/providers/bank-provider'
import { ContractsRepository } from '../src/contracts/contracts.repository'
import { accountRef } from '../src/shared/crypto/encryption'
import { DatabaseService } from '../src/shared/database/database.service'

loadLocalEnv()

const CONNECTION = 'demo-seed'
const OWN_IBAN = 'DE02120300000000000042'
const START = { year: 2024, month: 9 } // first month with payments

const config = loadBankingConfig({ ...process.env, BANKING_PROVIDER: process.env.BANKING_PROVIDER || 'mock' }).config

if (!config) {
  throw new Error('Could not load the banking config (is BANKING_ENCRYPTION_KEY set in api/.env?)')
}
if (config.isProd) {
  throw new Error('Refusing to seed demo data in production')
}

const database = new DatabaseService()
const txs = new BankTransactionsStore(database, config)
const contracts = new ContractsRepository(database, config)
const { db } = database
const user = db.prepare("SELECT id FROM users WHERE email = 'dev@localhost'").get() as { id: string } | undefined

if (!user) {
  throw new Error('No dev@localhost user yet: open the app once, then run this again')
}

if (process.argv.includes('--remove')) {
  console.log(`Removed ${txs.deleteForConnection(user.id, CONNECTION)} demo transactions`)
  console.log(
    `Removed ${contracts.deleteDetected(user.id)} detected contracts (they are found again on the next visit)`,
  )
  process.exit(0)
}

// A small seeded generator, so a re-run produces the same rows and the dedupe keeps them from doubling
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = rng(42)
const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
const between = (lo: number, hi: number) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100

const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const todayIso = iso(today.getFullYear(), today.getMonth() + 1, today.getDate())

interface Recurring {
  who: string
  text: (y: number, m: number) => string
  day: number
  amount: (y: number, m: number, i: number) => number
  /** Months (1-12) it is paid in; omit for every month */
  inMonths?: number[]
  /** Stops after this month (an ended contract) */
  until?: string
  /** Does not start before this month */
  from?: string
  iban?: string
}

const ym = (y: number, m: number) => `${y}-${pad(m)}`
const label = (y: number, m: number) => `${pad(m)}/${y}`

const RECURRING: Recurring[] = [
  {
    who: 'Hausverwaltung Müller GmbH',
    text: (y, m) => `Miete Hauptstr. 12 ${label(y, m)}`,
    day: 1,
    // A rent rise this autumn, so the "price changed" note shows
    amount: (y, m) => (ym(y, m) >= '2026-09' ? 1020 : ym(y, m) >= '2025-09' ? 950 : 920),
    iban: 'DE89370400440532013000',
  },
  {
    who: 'Vattenfall Strom',
    text: (y, m) => `Abschlag Strom ${label(y, m)} Kundennr. 4471102`,
    day: 4,
    // Winter costs more, and the bill drifts: a variable contract
    amount: (_y, m, i) =>
      Math.round((60 + 15 * Math.cos(((m - 1) / 12) * 2 * Math.PI) + ((i * 7) % 5) - 2) * 100) / 100,
  },
  { who: 'Telekom Deutschland GmbH', text: (y, m) => `Internet DSL ${label(y, m)}`, day: 5, amount: () => 39.95 },
  { who: 'Vodafone GmbH', text: (y, m) => `Mobilfunk ${label(y, m)}`, day: 12, amount: () => 19.99 },
  { who: 'FitX Deutschland GmbH', text: (y, m) => `Mitgliedsbeitrag ${label(y, m)}`, day: 7, amount: () => 24.99 },
  {
    who: 'DB Vertrieb GmbH',
    text: (y, m) => `Deutschlandticket ${label(y, m)}`,
    day: 3,
    amount: (y, m) => (ym(y, m) >= '2025-01' ? 58 : 49),
  },
  {
    who: 'Santander Consumer Leasing GmbH',
    text: (y, m) => `Leasingrate Fahrzeug ${label(y, m)}`,
    day: 28,
    amount: () => 289,
  },
  {
    who: 'Trade Republic Bank GmbH',
    text: (y, m) => `Sparplan ETF World ${label(y, m)}`,
    day: 15,
    amount: () => 250,
  },
  { who: 'Scalable Capital', text: (y, m) => `Sparplan Depot ${label(y, m)}`, day: 1, amount: () => 100 },
  {
    who: 'Netflix',
    text: (y, m) => `Netflix.com ${label(y, m)}`,
    day: 8,
    amount: (y, m) => (ym(y, m) >= '2026-10' ? 15.99 : 12.99),
  },
  { who: 'Spotify', text: (y, m) => `Spotify Premium ${label(y, m)}`, day: 9, amount: () => 10.99 },
  {
    who: 'Sky Deutschland',
    text: (y, m) => `Sky Abo ${label(y, m)}`,
    day: 18,
    amount: () => 24.99,
    until: '2026-05', // cancelled: shows as an ended contract
  },
  {
    who: 'Allianz Versicherung',
    text: (y, m) => `Hausratversicherung Quartal ${label(y, m)}`,
    day: 15,
    amount: () => 37.5,
    inMonths: [3, 6, 9, 12],
  },
  {
    who: 'HUK-COBURG',
    text: y => `Haftpflichtversicherung Jahresbeitrag ${y}`,
    day: 10,
    amount: () => 89.4,
    inMonths: [1],
  },
  { who: 'ADAC e.V.', text: y => `ADAC Mitgliedschaft ${y}`, day: 20, amount: () => 54, inMonths: [3] },
]

const out: BankTransaction[] = []
let n = 0
const add = (date: string, who: string, description: string, amount: number, iban?: string) => {
  if (date > todayIso) {
    return
  }
  out.push({
    date,
    description,
    amount,
    currency: 'EUR',
    recipient: who,
    recipientIban: iban,
    referenceAccount: OWN_IBAN,
    externalId: `demo:${date}:${n++}`,
    accountId: 'demo-main',
    bankName: 'Demo Bank',
    accountLabel: '…0042',
    accountRef: accountRef('demo-main'),
    rawData: { source: 'demo' },
  })
}

let i = 0

for (let y = START.year, m = START.month; ym(y, m) <= ym(today.getFullYear(), today.getMonth() + 1); i++) {
  for (const r of RECURRING) {
    if ((r.inMonths && !r.inMonths.includes(m)) || (r.until && ym(y, m) > r.until) || (r.from && ym(y, m) < r.from)) {
      continue
    }
    add(iso(y, m, r.day), r.who, `Lastschrift ${r.who} ${r.text(y, m)}`, -r.amount(y, m, i), r.iban)
  }
  add(iso(y, m, 28), 'Acme GmbH', `Gehalt ${label(y, m)}`, 3200)
  // Everyday spending: lots of payments, varying amounts, no rhythm. None of it is a contract.
  for (let k = 0; k < 14; k++) {
    const day = 1 + Math.floor(rnd() * 28)
    const [who, lo, hi] = pick<[string, number, number]>([
      ['REWE Markt', 12, 70],
      ['Lidl', 8, 45],
      ['Aldi Süd', 10, 55],
      ['EDEKA', 9, 60],
      ['Cafe Central', 3, 9],
      ['Shell', 35, 75],
      ['Amazon', 8, 120],
      ['dm-drogerie markt', 6, 30],
      ['Restaurant Zur Linde', 18, 60],
    ])

    add(iso(y, m, day), who, `Kartenzahlung ${who} ${pad(day)}.${pad(m)}.`, -between(lo, hi))
  }
  m++
  if (m > 12) {
    m = 1
    y++
  }
}

const added = txs.save(user.id, CONNECTION, out)

console.log(`Demo data: ${out.length} transactions (${added} new) from ${ym(START.year, START.month)} to today`)
