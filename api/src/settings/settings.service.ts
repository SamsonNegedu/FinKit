import { Injectable } from '@nestjs/common'
import { SettingsRepository } from './settings.repository'
import { CategoryList } from './categories.schema'
import { SheetConfig, SheetConfigSchema, defaultSheetConfig } from './sheet-config.schema'

/** Preferences that need to follow you across browsers: mainly how your Google Sheet is laid out. */
@Injectable()
export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  sheetConfig(userId: string): SheetConfig {
    return SheetConfigSchema.parse(this.settings.read<Partial<SheetConfig>>(userId, 'sheetConfig', {})) // fills in defaults
  }

  saveSheetConfig(userId: string, config: SheetConfig) {
    this.settings.write(userId, 'sheetConfig', config)
  }

  resetSheetConfig(userId: string) {
    this.settings.write(userId, 'sheetConfig', defaultSheetConfig())
  }

  /** The person's own category list, or null until they have changed it (their sheet's categories apply until then). */
  categories(userId: string): CategoryList | null {
    return this.settings.read<CategoryList | null>(userId, 'categories', null)
  }

  saveCategories(userId: string, list: CategoryList) {
    this.settings.write(userId, 'categories', list)
  }

  everything(userId: string) {
    const stored = this.settings.readAll(userId)

    return {
      ...stored,
      sheetConfig: stored.sheetConfig ? SheetConfigSchema.parse(stored.sheetConfig) : defaultSheetConfig(),
    }
  }

  get<T>(userId: string, key: string): T | null {
    return this.settings.read<T | null>(userId, key, null)
  }

  set(userId: string, key: string, value: unknown) {
    this.settings.write(userId, key, value)
  }
}
