import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

// The bank's return URL carries a one-time code and state. Keep them out of the logs.
export const redact = (line: string) => line.replace(/([?&](?:code|state)=)[^&\s]+/g, '$1[redacted]')

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction) {
    const started = Date.now()

    res.on('finish', () =>
      this.logger.log(redact(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`)),
    )
    next()
  }
}
