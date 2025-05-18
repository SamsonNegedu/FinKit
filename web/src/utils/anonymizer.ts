import { RawTransaction } from '../types';

// German column mappings
const GERMAN_COLUMNS = {
  'Buchungstag': 'date',
  'Referenzkonto': 'reference_account',
  'Name Referenzkonto': 'reference_account_name',
  'Betrag': 'amount',
  'Kontostand': 'balance',
  'Waehrung': 'currency',
  'Beguenstigter/Auftraggeber': 'recipient',
  'IBAN Beguenstigter/Auftraggeber': 'recipient_iban',
  'Verwendungszweck': 'description',
  'E-Ref': 'e_ref',
  'Mandatsreferenz': 'mandate_ref',
  'Glaeubiger-ID': 'creditor_id',
  'Analyse-Hauptkategorie': 'category',
  'Analyse-Unterkategorie': 'subcategory',
  'Analyse-Vertrag': 'contract',
  'Analyse-Vertragsturnus': 'contract_cycle',
  'Analyse-Vertrags-ID': 'contract_id',
  'Analyse-Umbuchung': 'transfer',
  'Analyse-Vom frei verfuegbaren Einkommen ausgeschlossen': 'excluded_from_income',
  'Analyse-Umsatzart': 'transaction_type',
  'Analyse-Betrag': 'analyzed_amount',
  'Analyse-Woche': 'week',
  'Analyse-Monat': 'month',
  'Analyse-Quartal': 'quarter',
  'Analyse-Jahr': 'year'
};

// Patterns for identifying personal data
const PERSONAL_DATA_PATTERNS = {
  // IBAN patterns for different countries
  iban: /[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}/g,
  
  // Credit card patterns (16 digits, possibly with spaces or dashes)
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
  
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (international format)
  phone: /(?:\+?[0-9]{1,3}[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}/g,
  
  // German postal codes
  postalCode: /\b[0-9]{5}\b/g,
  
  // German tax numbers
  taxNumber: /\b[0-9]{2,3}\/[0-9]{2,3}\/[0-9]{2,5}\b/g,
  
  // German social security numbers
  socialSecurity: /\b[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}\b/g
};


// Function to anonymize a string based on its type
const anonymizeString = (str: string, type: string): string => {
  if (!str) return str;

  switch (type) {
    case 'iban':
      // Keep first 4 and last 4 characters of IBAN
      return str.replace(PERSONAL_DATA_PATTERNS.iban, match => 
        `${match.slice(0, 4)}${'*'.repeat(match.length - 8)}${match.slice(-4)}`
      );
    
    case 'creditCard':
      // Keep last 4 digits of credit card
      return str.replace(PERSONAL_DATA_PATTERNS.creditCard, match => 
        `****-****-****-${match.replace(/[^0-9]/g, '').slice(-4)}`
      );
    
    case 'email':
      // Keep first letter and domain
      return str.replace(PERSONAL_DATA_PATTERNS.email, match => {
        const [local, domain] = match.split('@');
        return `${local[0]}***@${domain}`;
      });
    
    case 'phone':
      // Keep country code and last 4 digits
      return str.replace(PERSONAL_DATA_PATTERNS.phone, match => {
        const digits = match.replace(/[^0-9]/g, '');
        return `+${digits.slice(0, -4)}****`;
      });
    
    case 'postalCode':
      // Keep first 2 digits
      return str.replace(PERSONAL_DATA_PATTERNS.postalCode, match => 
        `${match.slice(0, 2)}***`
      );
    
    case 'taxNumber':
    case 'socialSecurity':
      // Keep first 2 and last 2 digits
      return str.replace(PERSONAL_DATA_PATTERNS[type], match => 
        `${match.slice(0, 2)}${'*'.repeat(match.length - 4)}${match.slice(-2)}`
      );
    
    default:
      return str;
  }
};

export const normalizeColumnNames = (headers: string[]): string[] => {
  return headers.map(header => {
    const normalized = GERMAN_COLUMNS[header as keyof typeof GERMAN_COLUMNS];
    return normalized || header.toLowerCase();
  });
};

// Function to anonymize a transaction
export const anonymizeTransaction = (transaction: RawTransaction): RawTransaction => {
  const anonymized = { ...transaction };

  // Anonymize description while preserving merchant names
  if (anonymized.description) {
    let description = anonymized.description;
    
    // Anonymize all personal data patterns
    Object.entries(PERSONAL_DATA_PATTERNS).forEach(([type]) => {
      description = anonymizeString(description, type);
    });
    
    anonymized.description = description;
  }

  // Anonymize any other fields that might contain personal data
  if (anonymized.reference) {
    anonymized.reference = anonymizeString(anonymized.reference, 'iban');
  }

  return anonymized;
};

// Function to check if a string contains personal data
export const containsPersonalData = (str: string): boolean => {
  return Object.values(PERSONAL_DATA_PATTERNS).some(pattern => 
    pattern.test(str)
  );
};

// Function to get the type of personal data in a string
export const getPersonalDataType = (str: string): string | null => {
  for (const [type, pattern] of Object.entries(PERSONAL_DATA_PATTERNS)) {
    if (pattern.test(str)) {
      return type;
    }
  }
  return null;
};
