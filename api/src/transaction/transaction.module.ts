import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PromptService } from './prompt.service';
import { AiModule } from '../ai/ai.module';
import { TransactionCacheService } from './transaction-cache.service';

@Module({
  imports: [AiModule],
  controllers: [TransactionController],
  providers: [TransactionService, PromptService, TransactionCacheService],
})
export class TransactionModule {} 
