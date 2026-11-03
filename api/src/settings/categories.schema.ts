import { z } from 'zod'

/** Money categories the app always has, apart from the person's own; they cannot be added, archived or repeated. */
export const SYSTEM_CATEGORIES = ['Income', 'Cash', 'Savings', 'Investment', 'Transfer']

const name = z.string().trim().min(1).max(40)
const key = (n: string) => n.toLowerCase()

// An icon is named by the app's own icon set (the app ignores one it does not know); a color is a hex code
const style = z.object({
  icon: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

/**
 * A person's own spending categories. `active` can be picked for new transactions; `archived` ones no longer can,
 * but stay in filters, charts and history so a past year keeps its meaning.
 */
export const CategoryListSchema = z
  .object({
    active: z.array(name).max(100),
    archived: z.array(name).max(200),
    /** An icon and a color a category was given, by category name */
    style: z
      .record(name, style)
      .refine(s => Object.keys(s).length <= 300, 'Too many styles')
      .optional(),
    /** Subcategories inside a category, by category name: Shopping › Fashion, Gear. Never counted apart from the parent. */
    details: z
      .record(name, z.array(name).max(50))
      .refine(d => Object.keys(d).length <= 100, 'Too many categories with details')
      .optional(),
  })
  .superRefine((list, ctx) => {
    const seen = new Set(SYSTEM_CATEGORIES.map(key))

    for (const n of [...list.active, ...list.archived]) {
      if (seen.has(key(n))) {
        ctx.addIssue({ code: 'custom', message: `"${n}" is already taken or reserved` })
      }
      seen.add(key(n))
    }

    for (const [parent, subs] of Object.entries(list.details ?? {})) {
      if (new Set(subs.map(key)).size !== subs.length) {
        ctx.addIssue({ code: 'custom', message: `"${parent}" has a subcategory twice` })
      }
    }
  })
export type CategoryList = z.infer<typeof CategoryListSchema>
