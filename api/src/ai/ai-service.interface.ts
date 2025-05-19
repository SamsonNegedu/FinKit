export interface IAiService {
  generateResponse(prompt: string): Promise<string>;
  validateResponse(response: string): boolean;
} 
