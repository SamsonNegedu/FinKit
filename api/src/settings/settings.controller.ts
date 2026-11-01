import { HttpCode, Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { SettingsService } from './settings.service'
import { SheetConfig, SheetConfigSchema } from './sheet-config.schema'

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('sheet')
  sheet() {
    return { success: true, data: this.service.sheetConfig() }
  }

  @Post('sheet')
  @HttpCode(200) // the previous API answered 200, not 201
  saveSheet(@Body(new ZodValidationPipe(SheetConfigSchema, { shape: 'success-false' })) config: SheetConfig) {
    this.service.saveSheetConfig(config)
    return { success: true, message: 'Settings saved' }
  }

  @Delete('sheet')
  resetSheet() {
    this.service.resetSheetConfig()
    return { success: true, message: 'Reset to defaults' }
  }

  @Get()
  all() {
    return { success: true, data: this.service.everything() }
  }

  // Generic key-value (declared after the fixed routes above)
  @Get(':key')
  get(@Param('key') key: string) {
    const value = this.service.get(key)
    if (value === null) throw new NotFoundException({ success: false, error: 'Not found' })
    return { success: true, data: value }
  }

  @Post(':key')
  @HttpCode(200) // the previous API answered 200, not 201
  set(@Param('key') key: string, @Body() body: { value?: unknown } & Record<string, unknown>) {
    this.service.set(key, body?.value ?? body)
    return { success: true }
  }
}
