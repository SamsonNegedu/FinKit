import { Injectable } from '@nestjs/common'
import { MerchantRulesRepository } from './merchant-rules.repository'

/**
 * Rules the app learns when you recategorize a merchant ("DeepSeek is Subscriptions").
 * The web app loads them all and does its own fuzzy matching.
 */
@Injectable()
export class MerchantRulesService {
  constructor(private readonly rules: MerchantRulesRepository) {}

  list() {
    return this.rules.findAll()
  }
  stats() {
    return this.rules.stats()
  }
  learn(merchant: string, category: string) {
    this.rules.save(merchant, category)
  }
  learnMany(rules: Array<{ merchant: string; category: string }>) {
    this.rules.saveMany(rules)
  }
  forget(merchant: string) {
    this.rules.delete(merchant)
  }
}
