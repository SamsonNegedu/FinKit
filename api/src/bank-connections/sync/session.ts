import { decrypt } from '../../shared/crypto/encryption'
import type { ConnectionRow } from '../connections/bank-connections.store'
import type { ProviderSession } from '../providers/bank-provider'

/** The stored link to the bank, decrypted. Only ever lives in memory for the length of a fetch. */
export function openSession(row: ConnectionRow, key: Buffer): ProviderSession {
  const secret = JSON.parse(decrypt(row.secret_blob, key)) as Pick<
    ProviderSession,
    'sessionId' | 'accounts' | 'requiredPsuHeaders'
  >

  return { ...secret, validUntil: row.valid_until }
}
