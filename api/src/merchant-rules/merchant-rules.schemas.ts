import { z } from 'zod'

export const SaveRuleSchema = z.object({
  merchant: z.string().min(1),
  category: z.string().min(1),
  /** A subcategory inside the category (Shopping › Fashion); absent means none */
  detail: z.string().trim().min(1).max(40).optional(),
})
export const SaveRulesSchema = z.object({ mappings: z.array(SaveRuleSchema) })
export type SaveRuleInput = z.infer<typeof SaveRuleSchema>
export type SaveRulesInput = z.infer<typeof SaveRulesSchema>
