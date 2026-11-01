import {
  HttpCode,
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { GoogleSheetsService } from './google-sheets.service'
import { ExportRequest, ExportRequestSchema } from './sheet-export.schemas'

@Controller('api/export')
export class SheetExportController {
  private readonly logger = new Logger(SheetExportController.name)

  constructor(private readonly sheets: GoogleSheetsService) {}

  // Write a month's figures into the sheet
  @Post('sheets')
  @HttpCode(200) // the previous API answered 200, not 201
  async exportRow(
    @Body(new ZodValidationPipe(ExportRequestSchema, { message: 'Invalid request body' })) body: ExportRequest,
  ) {
    return {
      success: true,
      data: await this.run(() => this.sheets.exportRow(body), 'Failed to export to Google Sheets'),
    }
  }

  // Read the sheet's header row so the app mirrors the real column layout
  @Post('sheets/layout')
  @HttpCode(200) // the previous API answered 200, not 201
  async layout(@Body() body: { sheetId?: string; tabName?: string }) {
    if (!body?.sheetId || !body?.tabName) throw new BadRequestException({ error: 'Missing sheetId or tabName' })
    return {
      success: true,
      data: await this.run(() => this.sheets.layout(body.sheetId!, body.tabName!), 'Failed to read sheet layout'),
    }
  }

  // The tabs available in the sheet
  @Post('sheets/metadata')
  @HttpCode(200) // the previous API answered 200, not 201
  async metadata(@Body() body: { sheetId?: string }) {
    if (!body?.sheetId) throw new BadRequestException({ error: 'Missing sheetId' })
    return {
      success: true,
      data: await this.run(() => this.sheets.metadata(body.sheetId!), 'Failed to fetch sheet metadata'),
    }
  }

  private async run<T>(action: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await action()
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error))
      throw new InternalServerErrorException({ error: error instanceof Error ? error.message : fallback })
    }
  }
}
