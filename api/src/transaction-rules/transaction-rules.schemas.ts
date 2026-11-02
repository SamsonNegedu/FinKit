import { z } from 'zod'

const words = z.array(z.string().trim().min(2).max(40)).max(6)

/**
 * What a rule looks for. Every condition given must hold, so a rule with more conditions is the more specific one.
 * It needs at least one, or it would match everything.
 */
export const RuleMatchSchema = z
  .object({
    payee: z.string().trim().min(2).max(80).optional(),
    words: words.optional(),
    /** The size of the payment, ignoring its sign */
    amount: z.number().positive().max(1e9).optional(),
  })
  .refine(m => Boolean(m.payee) || (m.words?.length ?? 0) > 0 || m.amount !== undefined, {
    message: 'A rule needs at least one condition',
  })
export type RuleMatch = z.infer<typeof RuleMatchSchema>

export const CreateRuleSchema = z.object({
  match: RuleMatchSchema,
  category: z.string().trim().min(1).max(40),
})
export type CreateRuleInput = z.infer<typeof CreateRuleSchema>

export const RuleIdSchema = z.string().uuid()
