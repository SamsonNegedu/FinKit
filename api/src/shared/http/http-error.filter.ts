import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Response } from 'express'

const TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
}

/**
 * Keeps error bodies in the shape the web app already reads ({ error: "…" }) and never leaks
 * internals: anything unexpected becomes a plain 500.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError')

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      // Nest's own errors look like { statusCode, message, error }; ours are already final
      const ours = typeof body === 'object' && body !== null && !('statusCode' in body)

      return res.status(status).json(ours ? body : { error: TEXT[status] ?? 'Error' })
    }
    // body-parser errors (oversized or malformed JSON) carry their own status
    const status = (exception as { status?: number })?.status

    if (typeof status === 'number' && status >= 400 && status < 500) {
      return res.status(status).json({ error: TEXT[status] ?? 'Bad Request' })
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception))

    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
