import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const text = (max: number) => z.string().trim().min(1).max(max)
const currency = z.string().regex(/^[A-Z]{3}$/)

export const IdParamSchema = z.string().uuid()

const TripFields = {
  name: text(80),
  location: text(80),
  startDate: date.nullable().optional(),
  endDate: date.nullable().optional(),
  budget: z.number().positive().max(1e9).nullable().optional(),
  budgetCurrency: currency.nullable().optional(),
  travelers: z.array(text(40)).max(10).optional(),
}

// Planning can start months before the trip, so the dates only describe the travel itself
const orderedDates = (t: { startDate?: string | null; endDate?: string | null }) =>
  !t.startDate || !t.endDate || t.endDate >= t.startDate

export const CreateTripSchema = z.object(TripFields).refine(orderedDates, { message: 'endDate is before startDate' })
export const UpdateTripSchema = z
  .object({
    ...TripFields,
    name: TripFields.name.optional(),
    location: TripFields.location.optional(),
    archived: z.boolean().optional(),
  })
  .refine(orderedDates, { message: 'endDate is before startDate' })

// A funding item is money moved into the trip's balance; a cost item is money spent from it
const Ref = z.string().regex(/^([0-9a-f]{64}|manual:[0-9a-f-]{36})$/)
const Who = text(40).nullable().optional()

export const TagItemsSchema = z.object({
  items: z
    .array(
      z.object({
        ref: Ref,
        kind: z.enum(['cost', 'funding']),
        category: text(40).optional(),
        subcategory: text(40).nullable().optional(),
        place: text(40).nullable().optional(),
        shared: z.boolean().optional(),
        paidBy: Who,
      }),
    )
    .min(1)
    .max(500),
})
export const RemoveItemsSchema = z.object({ refs: z.array(Ref).min(1).max(500) })
export const CategorySchema = z.object({ name: text(40) })
export const EntrySchema = z.object({
  date,
  amount: z.number().positive().max(1e9),
  currency,
  note: text(80),
  category: text(40),
  subcategory: Who,
  place: Who,
  shared: z.boolean().optional(),
  paidBy: Who,
})

export type CreateTripInput = z.infer<typeof CreateTripSchema>
export type UpdateTripInput = z.infer<typeof UpdateTripSchema>
export type TagItemsInput = z.infer<typeof TagItemsSchema>
export type EntryInput = z.infer<typeof EntrySchema>
