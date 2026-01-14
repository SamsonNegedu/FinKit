import OpenAI from 'openai'

interface TransactionInput {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
}

interface CategorizedTransaction {
  id: string;
  category: string;
  merchant?: string;
}

// Lazy initialization to avoid throwing on import
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

const SYSTEM_PROMPT = `You are a transaction categorization assistant. Given a list of bank transactions, categorize each one into the most appropriate category.

Available categories:
- Groceries (supermarkets, food stores)
- Eating Out (restaurants, cafes, food delivery)
- Personal Entertainment (games, streaming, apps)
- Subscriptions (recurring digital services)
- Car (fuel, parking, car-related)
- Public Transport (trains, buses, metro)
- Internet (internet/phone bills)
- Electricity (utility bills)
- Insurance (all types of insurance)
- Travel (flights, hotels, vacation)
- Family (gifts to family, family expenses)
- Radio Tax (broadcasting fees)
- Health & Wellbeing (pharmacy, doctors, gym)
- Other (anything that doesn't fit above)
- Gifts (presents, donations)
- Income (salary, refunds, incoming transfers)
- Investment (stocks, ETFs, savings)
- Transfer (between own accounts - internal)

For each transaction, return the category and extract the merchant name if possible.

Respond in JSON format only:
[
  { "id": "...", "category": "...", "merchant": "..." },
  ...
]`

export async function categorizeWithAI(transactions: TransactionInput[]): Promise<CategorizedTransaction[]> {
  const openai = getOpenAIClient()

  // Batch transactions for efficiency
  const BATCH_SIZE = 25
  const results: CategorizedTransaction[] = []

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)
    
    const userMessage = batch.map(tx => 
      `ID: ${tx.id}, Amount: ${tx.amount}, Date: ${tx.date}, Description: ${tx.description}`
    ).join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        const parsed = JSON.parse(content)
        const items = Array.isArray(parsed) ? parsed : parsed.transactions || []
        results.push(...items)
      } catch (e) {
        console.error('Failed to parse AI response:', e)
      }
    }
  }

  return results
}
