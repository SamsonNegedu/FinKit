import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'IAiService',
      useFactory: () => {
        return new OpenAIService();
      },
      inject: [ConfigService],
    },
  ],
  exports: ['IAiService'],
})
export class AiModule {} 
