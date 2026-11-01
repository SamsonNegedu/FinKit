import { z } from 'zod'
import { ColumnSchema, SheetIdSchema, TabNameSchema } from './a1'

export const ExportRequestSchema = z.object({
  sheetId: SheetIdSchema,
  tabName: TabNameSchema,
  month: z.string(),
  monthFormat: z.enum(['short', 'long', 'numeric']),
  categoryValues: z.array(z.object({ column: ColumnSchema, value: z.number() })),
  income: z.number(),
  savings: z.number().optional(),
  investment: z.number().optional(),
  constantColumns: z.array(ColumnSchema).optional(),
  incomeColumn: ColumnSchema.optional(),
  savingsColumn: ColumnSchema.optional(),
  investmentColumn: ColumnSchema.optional(),
})
export type ExportRequest = z.infer<typeof ExportRequestSchema>

export const LayoutRequestSchema = z.object({ sheetId: SheetIdSchema, tabName: TabNameSchema })
export const MetadataRequestSchema = z.object({ sheetId: SheetIdSchema })
