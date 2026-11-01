import { DynamicModule, Global, Module } from '@nestjs/common'
import { DATABASE_FILE, DatabaseService } from './database.service'

@Global()
@Module({})
export class DatabaseModule {
  /** `file` overrides where the database lives (tests pass ':memory:'). */
  static forRoot(file?: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DATABASE_FILE, useValue: file }, DatabaseService],
      exports: [DatabaseService],
    }
  }
}
