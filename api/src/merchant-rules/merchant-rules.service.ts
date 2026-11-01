import { Injectable } from '@nestjs/common'
import { MerchantRulesRepository } from './merchant-rules.repository'

/**
 * Rules the app learns when you recategorize a merchant ("DeepSeek is Subscriptions").
 * The web app loads them all and does its own fuzzy matching.
 */
@Injectable()
export class MerchantRulesService {
  constructor(private readonly rules: MerchantRulesRepository) {}

  list(userId: string) {
    return this.rules.findAll(userId)
  }

  stats(userId: string) {
    return this.rules.stats(userId)
  }

  learn(userId: string, merchant: string, category: string) {
    this.rules.save(userId, merchant, category)
  }

  learnMany(userId: string, rules: Array<{ merchant: string; category: string }>) {
    this.rules.saveMany(userId, rules)
  }

  forget(userId: string, merchant: string) {
    this.rules.delete(userId, merchant)
  }
}
