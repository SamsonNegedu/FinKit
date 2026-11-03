import type { ConnectionRow } from './bank-connections.store'
import { MS_PER_DAY } from '../../shared/constants/time'
import { CONNECTION_EXPIRING_SOON_DAYS } from '../constants'

export { CONNECTION_EXPIRING_SOON_DAYS as EXPIRING_DAYS }

/** What a person should be told about a connection: it runs out of consent after a set number of days. */
export function connectionStatus(row: Pick<ConnectionRow, 'status' | 'valid_until'>, now: Date) {
  const left = Math.ceil((new Date(row.valid_until).getTime() - now.getTime()) / MS_PER_DAY)
  let status: 'active' | 'expiring' | 'expired'

  if (row.status === 'expired' || left <= 0) {
    status = 'expired'
  } else if (left <= CONNECTION_EXPIRING_SOON_DAYS) {
    status = 'expiring'
  } else {
    status = 'active'
  }

  return { status, daysLeft: Math.max(left, 0) }
}
