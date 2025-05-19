import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  geminiApiKey: process.env.GEMINI_API_KEY,
  modelName: process.env.GEMINI_MODEL_NAME || 'gemini-pro',
  maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.1'),
})); 
