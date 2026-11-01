import { BadRequestException, PipeTransform } from '@nestjs/common'
import { ZodType } from 'zod'

interface Options {
  /** Error text in the response body */
  message?: string
  /** Body shape the existing clients expect: { error, details } or { success: false, error: issues } */
  shape?: 'error-details' | 'success-false'
}

/** Validates a request body against a zod schema and passes on the parsed value. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(
    private readonly schema: ZodType<T>,
    private readonly options: Options = {},
  ) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (result.success) return result.data
    const { message = 'Invalid request', shape = 'error-details' } = this.options
    throw new BadRequestException(
      shape === 'success-false'
        ? { success: false, error: result.error.issues }
        : { error: message, details: result.error.issues },
    )
  }
}
