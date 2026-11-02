import { AccessSettings, loadAccessSettings } from '../access/access.settings'
import { BankingConfig, loadBankingConfig } from './config/banking.config'

export interface BankingGate {
  access: AccessSettings
  /** Present when banking is switched on, even if it is set up wrongly (see `problems`) */
  config?: BankingConfig
  /** Why banking cannot run; empty when it can (or when it is simply off) */
  problems: string[]
}

const decided = new WeakMap<NodeJS.ProcessEnv, BankingGate>()

/**
 * Whether banking runs at all: off, misconfigured, or ready. It fails closed. Everything that is only
 * useful with banking (the connections, trips, contracts) asks this one place, and gets the same answer
 * and the same config object for the same environment.
 */
export function resolveBanking(env: NodeJS.ProcessEnv = process.env): BankingGate {
  const known = decided.get(env)

  if (known) {
    return known
  }
  const access = loadAccessSettings(env)
  const { config, errors } = loadBankingConfig(env)
  const problems = [
    ...errors,
    ...(config && access.isProd && access.mode !== 'cloudflare'
      ? ['CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are required in production']
      : []),
  ]
  const gate = { access, config, problems }

  decided.set(env, gate)

  return gate
}

/** The config only when banking can actually run. */
export const readyConfig = (gate: BankingGate) => (gate.config && gate.problems.length === 0 ? gate.config : undefined)
