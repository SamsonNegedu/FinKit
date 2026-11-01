import { Module } from '@nestjs/common'
import { GoogleSheetsService } from './google-sheets.service'
import { SheetExportController } from './sheet-export.controller'

@Module({ controllers: [SheetExportController], providers: [GoogleSheetsService] })
export class SheetExportModule {}
