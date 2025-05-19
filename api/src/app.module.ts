import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransactionModule } from './transaction/transaction.module';
import { AiModule } from './ai/ai.module';
import aiConfig from './ai/ai.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [aiConfig],
    }),
    TransactionModule,
    AiModule,
  ],
})
export class AppModule {} 
