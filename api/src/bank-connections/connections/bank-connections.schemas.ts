import { z } from 'zod'

export const ConnectSchema = z.object({
  bank: z.string().min(1).max(100),
  country: z.string().length(2).default('DE'),
  reconnect: z.string().uuid().optional(),
})
export type ConnectInput = z.infer<typeof ConnectSchema>

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const SyncSchema = z.object({
  from: day.optional(),
  to: day.optional(),
})
export type SyncInput = z.infer<typeof SyncSchema>
