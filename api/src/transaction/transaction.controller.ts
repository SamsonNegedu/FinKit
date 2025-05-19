import { Controller, Post, Body } from '@nestjs/common';
import { TransactionService, Transaction } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('categorize')
  async categorizeTransactions(@Body() transactions: Transaction[]) {
    return this.transactionService.categorizeTransactions(transactions);
  }
} 
