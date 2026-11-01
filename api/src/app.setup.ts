import { INestApplication } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { HttpErrorFilter } from './shared/http/http-error.filter'

/** HTTP behaviour shared by the real server and the tests. */
export function configureApp(app: INestApplication, env: NodeJS.ProcessEnv = process.env) {
  const express = app as NestExpressApplication
  express.useBodyParser('json', { limit: '5mb' }) // large batch learn/export payloads
  app.use(helmet())
  app.enableCors({
    // In production, set ALLOWED_ORIGIN (e.g. https://finkit.example.com) to lock this down.
    // Unset keeps the old behaviour (any origin), which is fine behind Cloudflare Access.
    origin:
      env.NODE_ENV === 'production' ? env.ALLOWED_ORIGIN || '*' : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-FinKit'],
  })
  app.useGlobalFilters(new HttpErrorFilter())
  return app
}
