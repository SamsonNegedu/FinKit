import { Injectable, Logger } from '@nestjs/common';
import { IAiService } from './ai-service.interface';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService implements IAiService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens = 2000; // Reduced to leave more room for the prompt
  private readonly temperature = 0.1; // Lower temperature for more consistent results

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Use model from env or fallback to gpt-3.5-turbo
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.logger.log(`Using OpenAI model: ${this.model}`);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      this.logger.debug(`Generating response using ${this.model}`);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction analyzer. Always respond with valid JSON arrays containing transaction analysis results. Be concise and accurate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response received from OpenAI');
      }

      this.logger.debug(`Successfully generated response with ${response.length} characters`);
      return response;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`, error.stack);
      throw error;
    }
  }

  validateResponse(response: string): boolean {
    try {
      // Check if response is a valid JSON array
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) {
        this.logger.warn('Response is not a JSON array');
        return false;
      }

      // Validate each transaction in the array
      return parsed.every(transaction => {
        const requiredFields = ['id', 'category', 'amount', 'type', 'currency'];
        return requiredFields.every(field => field in transaction);
      });
    } catch (error) {
      this.logger.warn(`Invalid JSON response: ${error.message}`);
      return false;
    }
  }
} 
