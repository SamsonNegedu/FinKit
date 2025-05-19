import { Injectable, Inject, Logger } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { IAiService } from 'src/ai/ai-service.interface';
import { TransactionDto } from './dto/transaction.dto';
import { TransactionCacheService } from './transaction-cache.service';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  currency: string;
}

export interface TransactionCategorization {
  id: string;
  category: string;
  merchant?: string;
  description: string;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly BATCH_SIZE = 20;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly MAX_CONCURRENT_BATCHES = 3;

  constructor(
    @Inject('IAiService') private readonly aiService: IAiService,
    private readonly promptService: PromptService,
    private readonly cacheService: TransactionCacheService
  ) {}

  private cleanJsonResponse(response: string): string {
    // First, remove any markdown code block formatting
    let cleaned = response
      .replace(/```json\n?/g, '')  // Remove opening ```json
      .replace(/```\n?/g, '')      // Remove closing ```
      .trim();                     // Remove any extra whitespace

    // If the response starts and ends with quotes, remove them
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    // Replace escaped newlines and quotes with their actual characters
    cleaned = cleaned
      .replace(/\\n/g, '\n')       // Replace \n with actual newlines
      .replace(/\\"/g, '"')        // Replace \" with actual quotes
      .replace(/\\\\/g, '\\');     // Replace \\ with single backslash

    return cleaned;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processBatchWithRetry(batch: TransactionDto[], batchIndex: number): Promise<TransactionCategorization[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const prompt = this.promptService.generateTransactionCategorizationPrompt(batch);
        const response = await this.aiService.generateResponse(prompt);
        const cleanedResponse = this.cleanJsonResponse(response);
        
        if (!this.isValidJsonStructure(cleanedResponse)) {
          throw new Error('Invalid JSON structure in response');
        }

        const batchResults = JSON.parse(cleanedResponse);
        
        if (batchResults.length !== batch.length) {
          throw new Error(`Expected ${batch.length} transactions but got ${batchResults.length}`);
        }

        // Update cache with new categorizations
        batchResults.forEach((result: TransactionCategorization, index: number) => {
          this.cacheService.updateCache(result, batch[index]);
        });

        return batchResults;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${this.MAX_RETRIES} failed for batch ${batchIndex + 1}: ${error.message}`
        );
        
        if (attempt < this.MAX_RETRIES) {
          await this.sleep(this.RETRY_DELAY * attempt);
        }
      }
    }

    throw new Error(`Failed to process batch ${batchIndex + 1} after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  private isValidJsonStructure(jsonStr: string): boolean {
    try {
      // Check if it starts with [ and ends with ]
      if (!jsonStr.trim().startsWith('[') || !jsonStr.trim().endsWith(']')) {
        return false;
      }

      // Count opening and closing brackets to ensure they match
      let openBrackets = 0;
      let closeBrackets = 0;
      let inString = false;
      let escaped = false;

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"' && !escaped) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '[') openBrackets++;
          if (char === ']') closeBrackets++;
        }
      }

      return openBrackets === closeBrackets;
    } catch {
      return false;
    }
  }

  private async processBatchesConcurrently(batches: TransactionDto[][]): Promise<TransactionCategorization[]> {
    const results: TransactionCategorization[] = [];
    const errors: Error[] = [];

    // Process batches in chunks to limit concurrency
    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
      const batchChunk = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES);
      this.logger.debug(`Processing batch chunk ${i / this.MAX_CONCURRENT_BATCHES + 1} of ${Math.ceil(batches.length / this.MAX_CONCURRENT_BATCHES)}`);

      const batchPromises = batchChunk.map((batch, index) => 
        this.processBatchWithRetry(batch, i + index)
          .catch(error => {
            errors.push(error);
            return null;
          })
      );

      const batchResults = await Promise.all(batchPromises);
      
      // Filter out failed batches and add successful results
      batchResults.forEach(result => {
        if (result) {
          results.push(...result);
        }
      });

      // If we have errors, log them but continue processing
      if (errors.length > 0) {
        this.logger.error(`Errors occurred in batch chunk ${i / this.MAX_CONCURRENT_BATCHES + 1}:`, errors);
        errors.length = 0; // Clear errors for next chunk
      }
    }

    return results;
  }

  async categorizeTransactions(transactions: TransactionDto[]): Promise<TransactionCategorization[]> {
    try {
      const results: TransactionCategorization[] = [];
      const uncachedTransactions: TransactionDto[] = [];

      // First pass: Try to match with cached transactions
      for (const transaction of transactions) {
        const cachedMatch = this.cacheService.findMatch(transaction);
        if (cachedMatch) {
          results.push({
            id: transaction.id,
            category: cachedMatch.category,
            merchant: cachedMatch.merchant,
            description: transaction.description
          });
          this.logger.debug(`Found cached match for transaction ${transaction.id}`);
        } else {
          uncachedTransactions.push(transaction);
        }
      }

      // If we have uncached transactions, process them with OpenAI
      if (uncachedTransactions.length > 0) {
        this.logger.debug(`Processing ${uncachedTransactions.length} uncached transactions`);

        // Sort uncached transactions by date
        const sortedTransactions = [...uncachedTransactions].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Create batches
        const batches = [];
        for (let i = 0; i < sortedTransactions.length; i += this.BATCH_SIZE) {
          batches.push(sortedTransactions.slice(i, i + this.BATCH_SIZE));
        }

        // Process batches concurrently
        const aiResults = await this.processBatchesConcurrently(batches);
        results.push(...aiResults);
      }

      const cacheStats = this.cacheService.getCacheStats();
      this.logger.debug(
        `Successfully categorized ${results.length} transactions ` +
        `(${uncachedTransactions.length} via AI, cache size: ${cacheStats.size}, hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%)`
      );
      return results;
    } catch (error) {
      this.logger.error(`Error categorizing transactions: ${error.message}`, error.stack);
      throw error;
    }
  }
} 
