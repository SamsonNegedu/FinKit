import { HttpCode, Body, Controller, InternalServerErrorException, Logger, Post, UseGuards } from '@nestjs/common'
import { AccessGuard } from '../access/access.guard'
import { CsrfGuard } from '../access/csrf.guard'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { GoogleSheetsService } from './google-sheets.service'
import { ExportRequest, ExportRequestSchema, LayoutRequestSchema, MetadataRequestSchema } from './sheet-export.schemas'
import type { z } from 'zod'

@Controller('api/export')
@UseGuards(AccessGuard, CsrfGuard)
export class SheetExportController {
  private readonly logger = new Logger(SheetExportController.name)

  constructor(private readonly sheets: GoogleSheetsService) {}

  // Write a month's figures into the sheet
  @Post('sheets')
  @HttpCode(200) // the previous API answered 200, not 201
  async exportRow(
    @Body(
      new ZodValidationPipe(ExportRequestSchema, {
        message: 'Invalid request body',
      }),
    )
    body: ExportRequest,
  ) {
    return {
      success: true,
      data: await this.run(() => this.sheets.exportRow(body), 'Failed to export to Google Sheets'),
    }
  }

  // Read the sheet's header row so the app mirrors the real column layout
  @Post('sheets/layout')
  @HttpCode(200) // the previous API answered 200, not 201
  async layout(
    @Body(new ZodValidationPipe(LayoutRequestSchema, { message: 'Invalid sheetId or tabName' }))
    body: z.infer<typeof LayoutRequestSchema>,
  ) {
    return {
      success: true,
      data: await this.run(() => this.sheets.layout(body.sheetId, body.tabName), 'Failed to read sheet layout'),
    }
  }

  // The tabs available in the sheet
  @Post('sheets/metadata')
  @HttpCode(200) // the previous API answered 200, not 201
  async metadata(
    @Body(new ZodValidationPipe(MetadataRequestSchema, { message: 'Invalid sheetId' }))
    body: z.infer<typeof MetadataRequestSchema>,
  ) {
    return {
      success: true,
      data: await this.run(() => this.sheets.metadata(body.sheetId), 'Failed to fetch sheet metadata'),
    }
  }

  private async run<T>(action: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await action()
    } catch (error) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error))
      throw new InternalServerErrorException({ error: fallback })
    }
  }
}
