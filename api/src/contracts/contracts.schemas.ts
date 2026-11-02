import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const frequency = z.enum(['monthly', 'quarterly', 'yearly'])
/** One of the person's categories; the service checks it against their current list. */
const group = text(40)

export const IdParamSchema = z.string().uuid()

export const CreateContractSchema = z.object({
  name: text(80),
  group,
  amount: z.number().positive().max(1e7),
  currency: z.string().regex(/^[A-Z]{3}$/),
  frequency,
  kind: z.enum(['fixed', 'variable']).default('fixed'),
  startDate: date.nullable().optional(),
  note: text(300).optional(),
  kmPerYear: z.number().int().positive().max(1_000_000).optional(),
})
export type CreateContractInput = z.infer<typeof CreateContractSchema>

/** `null` clears a field the person set earlier. */
export const UpdateContractSchema = z.object({
  state: z.enum(['detected', 'confirmed', 'dismissed']).optional(),
  name: text(80).nullable().optional(),
  group: group.nullable().optional(),
  note: text(300).nullable().optional(),
  kmPerYear: z.number().int().positive().max(1_000_000).nullable().optional(),
})
export type UpdateContractInput = z.infer<typeof UpdateContractSchema>
