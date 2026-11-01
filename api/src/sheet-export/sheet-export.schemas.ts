import { z } from 'zod'

export const ExportRequestSchema = z.object({
  sheetId: z.string(),
  tabName: z.string(),
  month: z.string(),
  monthFormat: z.enum(['short', 'long', 'numeric']),
  categoryValues: z.array(z.object({ column: z.string(), value: z.number() })),
  income: z.number(),
  savings: z.number().optional(),
  investment: z.number().optional(),
  constantColumns: z.array(z.string()).optional(),
  incomeColumn: z.string().optional(),
  savingsColumn: z.string().optional(),
  investmentColumn: z.string().optional(),
})
export type ExportRequest = z.infer<typeof ExportRequestSchema>
