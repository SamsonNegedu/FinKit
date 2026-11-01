import { z } from 'zod'

/** A spreadsheet's id as it appears in its URL. */
export const SheetIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)

/** Tab names: up to 100 characters, none of the characters Google itself forbids, no control characters. */
export const TabNameSchema = z
  .string()
  .min(1)
  .max(100)
  // oxlint-disable-next-line no-control-regex
  .refine(name => !/[\u0000-\u001f\u007f[\]*?:/\\]/.test(name))

/** Column letters: A to ZZZ. */
export const ColumnSchema = z.string().regex(/^[A-Z]{1,3}$/)

/** A tab name made safe to put in front of "!" in a range: quoted, with quotes inside doubled. */
export const quoteSheetTabName = (tabName: string) => `'${tabName.replace(/'/g, "''")}'`
