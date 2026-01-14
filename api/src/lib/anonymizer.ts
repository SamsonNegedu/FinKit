// Server-side validation to ensure data is anonymized before processing

interface TransactionData {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
}

interface AnonymizationValidation {
  isValid: boolean;
  issues: string[];
}

// Patterns that indicate non-anonymized personal data
const PERSONAL_DATA_PATTERNS = {
  // Full IBAN (not anonymized)
  fullIban: /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16}/g,
  
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers
  phone: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  
  // German postal codes with city
  addressWithPostal: /\d{5}\s+[A-Za-zäöüÄÖÜß]+/g,
};

// Patterns that indicate properly anonymized data
const ANONYMIZED_PATTERNS = {
  // Anonymized IBAN: DE**************5515
  anonymizedIban: /[A-Z]{2}\*{10,}\d{4}/,
  
  // Pseudonymized name: Person_XXX
  pseudonymizedName: /Person_[A-Z0-9]{3,}/,
  
  // Anonymized account: Acc_XXXXXX
  anonymizedAccount: /Acc_[A-Z0-9]{6}/,
};

export function validateAnonymized(transactions: TransactionData[]): AnonymizationValidation {
  const issues: string[] = [];

  for (const tx of transactions) {
    // Check description for personal data
    for (const [patternName, pattern] of Object.entries(PERSONAL_DATA_PATTERNS)) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;
      
      if (pattern.test(tx.description)) {
        issues.push(`Transaction ${tx.id}: contains ${patternName} in description`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function containsPersonalData(text: string): boolean {
  for (const pattern of Object.values(PERSONAL_DATA_PATTERNS)) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}
