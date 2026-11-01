import { Injectable } from '@nestjs/common'
import { SettingsRepository } from './settings.repository'
import { SheetConfig, SheetConfigSchema, defaultSheetConfig } from './sheet-config.schema'

/** Preferences that need to follow you across browsers: mainly how your Google Sheet is laid out. */
@Injectable()
export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  sheetConfig(): SheetConfig {
    return SheetConfigSchema.parse(this.settings.read<Partial<SheetConfig>>('sheetConfig', {})) // fills in defaults
  }
  saveSheetConfig(config: SheetConfig) {
    this.settings.write('sheetConfig', config)
  }
  resetSheetConfig() {
    this.settings.write('sheetConfig', defaultSheetConfig())
  }

  everything() {
    const stored = this.settings.readAll()
    return {
      ...stored,
      sheetConfig: stored.sheetConfig ? SheetConfigSchema.parse(stored.sheetConfig) : defaultSheetConfig(),
    }
  }
  get<T>(key: string): T | null {
    return this.settings.read<T | null>(key, null)
  }
  set(key: string, value: unknown) {
    this.settings.write(key, value)
  }
}
