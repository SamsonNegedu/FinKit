import { z } from 'zod'

/** Keys for generic settings storage (fixed routes like `sheet` are declared separately). */
export const SettingKeyParamSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid setting key')

/**
 * Body is either `{ value: … }` (legacy) or the value itself. Matches the previous controller behaviour.
 */
export const SettingValueBodySchema = z.unknown().transform(raw => {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    const record = raw as Record<string, unknown>

    if (Object.keys(record).length === 1) {
      return record.value
    }
  }

  return raw
})

export type SettingValueBody = z.infer<typeof SettingValueBodySchema>
