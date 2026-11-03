export type Frequency = 'monthly' | 'quarterly' | 'yearly'
/** Fixed: the same every time (rent). Variable: regular but drifting (electricity). */
export type Kind = 'fixed' | 'variable'
export type State = 'detected' | 'confirmed' | 'dismissed' | 'manual'

/** What detection works out from the payments. Rewritten on every refresh. */
export interface Detected {
  name: string
  /** A sample payment's text, so a category can be worked out later from the person's current rules */
  sample: string
  /** The refs of the payments it was found from, so opening a contract reads just those and not every transaction */
  refs?: string[]
  kind: Kind
  frequency: Frequency
  amount: number // typical (median) payment, positive
  lastAmount: number
  firstDate: string
  lastDate: string
  nextExpected: string
  count: number
  /** When the latest payment differs from what came before, by how much it went from → to */
  priceChange: { from: number; to: number } | null
}

/** What the person chose. Never touched by detection. */
export interface UserData {
  name?: string
  /** Only for contracts added by hand: a detected contract's category lives in the person's merchant rules */
  group?: string
  note?: string
  /** A car lease or similar: used to show a cost per km. Entered by hand, never read from the bank. */
  kmPerYear?: number
  /** For manual contracts, which have no payments to detect */
  manual?: {
    amount: number
    frequency: Frequency
    kind: Kind
    startDate: string | null
  }
}

export interface ContractView {
  id: string
  state: State
  currency: string
  name: string
  /** The payee as the bank names it, before any rename; how a contract is matched to its transactions */
  payee: string | null
  /** One of the person's categories */
  group: string
  /** you: chosen by hand. rule: from your merchant rules. suggested: our guess. none: nothing to go on. */
  groupSource: 'you' | 'rule' | 'suggested' | 'none'
  kind: Kind
  frequency: Frequency
  amount: number
  monthly: number
  lastAmount: number | null
  firstDate: string | null
  lastDate: string | null
  nextExpected: string | null
  count: number
  /** Active unless the latest payment is overdue by half a period (cancelled, or moved elsewhere) */
  active: boolean
  priceChange: { from: number; to: number } | null
  note: string | null
  kmPerYear: number | null
  costPerKm: number | null
  /** When it was first found or added */
  foundAt: string | null
  /** Found after the first batch, within the last two weeks: worth a look */
  isNew: boolean
}
