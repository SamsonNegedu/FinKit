import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')

export const StoredTransactionsListQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export type StoredTransactionsListQuery = z.infer<typeof StoredTransactionsListQuerySchema>
