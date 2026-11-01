import './load-env'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { configureApp } from './app.setup'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  configureApp(app)
  app.enableShutdownHooks()
  const port = Number(process.env.PORT) || 3003

  // Unset listens on all interfaces, which the container needs. HOST=127.0.0.1 keeps a local run private.
  await app.listen(port, process.env.HOST || '0.0.0.0')
  new Logger('Bootstrap').log(`Server running on port ${port}`)
}
bootstrap()
