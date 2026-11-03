import { HttpCode, Body, Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { CategoryList, CategoryListSchema } from './categories.schema'
import { SettingsService } from './settings.service'
import { SheetConfig, SheetConfigSchema } from './sheet-config.schema'

@Controller('api/settings')
@UseGuards(AccessGuard, CsrfGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('sheet')
  sheet(@CurrentActor() actor: Actor) {
    return { success: true, data: this.service.sheetConfig(actor.userId) }
  }

  @Post('sheet')
  @HttpCode(200) // the previous API answered 200, not 201
  saveSheet(
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(SheetConfigSchema, { shape: 'success-false' }))
    config: SheetConfig,
  ) {
    this.service.saveSheetConfig(actor.userId, config)

    return { success: true, message: 'Settings saved' }
  }

  @Delete('sheet')
  resetSheet(@CurrentActor() actor: Actor) {
    this.service.resetSheetConfig(actor.userId)

    return { success: true, message: 'Reset to defaults' }
  }

  @Get('categories')
  categories(@CurrentActor() actor: Actor) {
    return { success: true, data: this.service.categories(actor.userId) }
  }

  @Post('categories')
  @HttpCode(200) // like the other saves here
  saveCategories(
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(CategoryListSchema, { shape: 'success-false' })) list: CategoryList,
  ) {
    this.service.saveCategories(actor.userId, list)

    return { success: true, data: list }
  }

  @Get()
  all(@CurrentActor() actor: Actor) {
    return { success: true, data: this.service.everything(actor.userId) }
  }

  // Generic key-value (declared after the fixed routes above)
  @Get(':key')
  get(@CurrentActor() actor: Actor, @Param('key') key: string) {
    const value = this.service.get(actor.userId, key)

    if (value === null) {
      throw new NotFoundException({ success: false, error: 'Not found' })
    }

    return { success: true, data: value }
  }

  @Post(':key')
  @HttpCode(200) // the previous API answered 200, not 201
  set(
    @CurrentActor() actor: Actor,
    @Param('key') key: string,
    @Body() body: { value?: unknown } & Record<string, unknown>,
  ) {
    this.service.set(actor.userId, key, body?.value ?? body)

    return { success: true }
  }
}
