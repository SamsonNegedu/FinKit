import { Injectable } from '@nestjs/common';
import { TransactionDto } from './dto/transaction.dto';

@Injectable()
export class PromptService {
  private readonly STANDARD_CATEGORIES = [
    'Rent',
    'Electricity',
    'Entertainment',
    'Subscriptions',
    'Public Transport',
    'Internet',
    'Insurance',
    'Travel',
    'Family',
    'Health & Wellbeing',
    'Other',
    'Gifts',
    'Drivers License',
    'Investment'
  ];

  generateTransactionCategorizationPrompt(transactions: TransactionDto[]): string {
    return `You are a financial transaction analyzer specializing in German bank transactions. Your task is to recategorize these transactions into standardized English categories and standardize the merchant field.

Rules:
1. Map the original German categories/descriptions to these standardized categories:
   ${this.STANDARD_CATEGORIES.join(', ')}

2. For each transaction, provide:
   - id: The transaction ID
   - description: A clean, simplified version of the description in English
   - category: Must be one of the standardized categories listed above
   - merchant: Standardize the merchant name (e.g., 'AMZNPrime DE*HL1SX37A5' and 'Amazon.de*RE7OS8W35' should both be standardized to 'Amazon')

3. Categorization guidelines:
   - Rent: Housing costs, rent payments, property-related expenses
   - Entertainment: Movies, games, events, leisure activities
   - Subscriptions: Regular payments for services (Netflix, Spotify, etc.)
   - Public Transport: Buses, trains, trams, taxis
   - Internet: Internet service providers, mobile data
   - Insurance: Health, car, home, life insurance
   - Travel: Hotels, flights, vacation expenses
   - Family: Childcare, education, family-related expenses
   - Health & Wellbeing: Medical expenses, gym memberships, wellness
   - Gifts: Presents, donations, charitable contributions
   - Drivers License: Driving-related expenses, license fees
   - Investment: Stocks, savings, financial investments
   - Other: Any transaction that doesn't fit the above categories

4. Return the response as a JSON array of objects, each containing the transaction ID and its analysis
5. Ensure the response is valid JSON
6. For income transactions, prefer categories like "Investment", "Other"
7. For expense transactions, use the most specific category that matches the transaction

Example response format:
[
  {
    "id": "tx1",
    "description": "Netflix subscription",
    "category": "Subscriptions",
    "merchant": "Netflix"
  }
]

Transactions to analyze:
${JSON.stringify(transactions)}`;
  }
} 
