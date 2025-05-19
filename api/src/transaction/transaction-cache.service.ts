import { Injectable, Logger } from '@nestjs/common';
import { TransactionDto } from './dto/transaction.dto';
import { TransactionCategorization } from './transaction.service';

interface CachedTransaction {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  merchant?: string;
  matchCount: number;
  lastUsed: Date;
}

@Injectable()
export class TransactionCacheService {
  private readonly logger = new Logger(TransactionCacheService.name);
  private readonly CACHE_MATCH_THRESHOLD = 0.8;
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly AMOUNT_TOLERANCE = 0.01;

  private transactionCache: Map<string, CachedTransaction> = new Map();

  private calculateSimilarity(str1: string, str2: string): number {
    // Convert strings to lowercase and remove special characters
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // If strings are identical after normalization, return 1
    if (s1 === s2) return 1;

    // Calculate Levenshtein distance
    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  findMatch(transaction: TransactionDto): CachedTransaction | null {
    let bestMatch: { transaction: CachedTransaction; score: number } | null = null;

    for (const [_, cached] of this.transactionCache) {
      // Only consider transactions of the same type and similar amount
      if (cached.type !== transaction.type) continue;
      if (Math.abs(cached.amount - transaction.amount) > this.AMOUNT_TOLERANCE) continue;

      const similarity = this.calculateSimilarity(
        transaction.description,
        cached.description
      );

      if (similarity >= this.CACHE_MATCH_THRESHOLD && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { transaction: cached, score: similarity };
      }
    }

    return bestMatch?.transaction || null;
  }

  updateCache(categorization: TransactionCategorization, transaction: TransactionDto): void {
    const cacheKey = `${transaction.type}_${transaction.amount}_${transaction.description}`;
    
    if (this.transactionCache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsedEntries();
    }

    const existing = this.transactionCache.get(cacheKey);
    if (existing) {
      existing.matchCount++;
      existing.lastUsed = new Date();
    } else {
      this.transactionCache.set(cacheKey, {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: categorization.category,
        merchant: categorization.merchant,
        matchCount: 1,
        lastUsed: new Date()
      });
    }
  }

  private evictLeastUsedEntries(): void {
    const entries = Array.from(this.transactionCache.entries());
    entries.sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime());
    const entriesToRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.1)); // Remove 10% of entries
    entriesToRemove.forEach(([key]) => this.transactionCache.delete(key));
    this.logger.debug(`Evicted ${entriesToRemove.length} least used entries from cache`);
  }

  getCacheStats(): { size: number; hitRate: number } {
    const totalRequests = this.transactionCache.size;
    const hits = Array.from(this.transactionCache.values()).reduce(
      (sum, entry) => sum + entry.matchCount,
      0
    );
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

    return {
      size: this.transactionCache.size,
      hitRate
    };
  }

  clearCache(): void {
    this.transactionCache.clear();
    this.logger.debug('Transaction cache cleared');
  }
} 
