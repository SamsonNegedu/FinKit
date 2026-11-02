import { z } from 'zod'

export const CategoryParamSchema = z.string().trim().min(1).max(40)
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/)

/** The same limit is replaced when the category and currency already have one, so saving is idempotent. */
export const SaveBudgetSchema = z.object({
  category: CategoryParamSchema,
  currency: CurrencySchema,
  amount: z.number().positive().max(1e7),
  rollover: z.boolean().default(false),
  /** The month the budget begins ("2026-11"), sent by the browser so it is the person's month, not the server's */
  startsMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .nullable()
    .default(null),
})
export type SaveBudgetInput = z.infer<typeof SaveBudgetSchema>

export const SaveCapSchema = z.object({ currency: CurrencySchema, amount: z.number().positive().max(1e8) })
export type SaveCapInput = z.infer<typeof SaveCapSchema>
