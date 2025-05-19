import { Injectable } from '@nestjs/common';
import { IAiService } from './ai-service.interface';

@Injectable()
export class AiService implements IAiService {
  constructor(private readonly aiService: IAiService) {}

  async generateResponse(prompt: string): Promise<string> {
    return this.aiService.generateResponse(prompt);
  }

  validateResponse(response: string): boolean {
    return this.aiService.validateResponse(response);
  }
} 
