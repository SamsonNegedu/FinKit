import type { RawTransaction } from '@/shared/types'

// Finanzguru export columns
const FINANZGURU_COLUMNS: Record<string, keyof RawTransaction | string> = {
  Buchungstag: 'date',
  Referenzkonto: 'referenceAccount',
  'Name Referenzkonto': 'referenceAccountName',
  Betrag: 'amount',
  Kontostand: 'balance',
  Waehrung: 'currency',
  Währung: 'currency',
  'Beguenstigter/Auftraggeber': 'recipient',
  'Begünstigter/Auftraggeber': 'recipient',
  'IBAN Beguenstigter/Auftraggeber': 'recipientIban',
  'IBAN Begünstigter/Auftraggeber': 'recipientIban',
  Verwendungszweck: 'description',
  'Analyse-Hauptkategorie': 'category',
  'Analyse-Unterkategorie': 'subcategory',
  'Analyse-Umbuchung': 'isTransfer',
}

// N26 CSV export columns (both German and English versions)
const N26_COLUMNS: Record<string, keyof RawTransaction | string> = {
  // German N26
  Datum: 'date',
  Empfänger: 'recipient',
  Kontonummer: 'recipientIban',
  Transaktionstyp: 'category',
  Verwendungszweck: 'description',
  'Betrag (EUR)': 'amount',
  'Betrag (Fremdwährung)': 'foreignAmount',
  Fremdwährung: 'foreignCurrency',
  Wechselkurs: 'exchangeRate',
  // English N26
  Date: 'date',
  Payee: 'recipient',
  'Account number': 'recipientIban',
  'Transaction type': 'category',
  'Payment reference': 'description',
  'Amount (EUR)': 'amount',
  'Amount (Foreign Currency)': 'foreignAmount',
  'Type Foreign Currency': 'foreignCurrency',
  'Exchange Rate': 'exchangeRate',
}

// DKB CSV export columns
const DKB_COLUMNS: Record<string, keyof RawTransaction | string> = {
  Buchungstag: 'date',
  Wertstellung: 'valueDate',
  Buchungstext: 'category',
  'Auftraggeber / Begünstigter': 'recipient',
  Verwendungszweck: 'description',
  Kontonummer: 'recipientIban',
  BLZ: 'bankCode',
  'Betrag (EUR)': 'amount',
  'Gläubiger-ID': 'creditorId',
  Mandatsreferenz: 'mandateRef',
  Kundenreferenz: 'customerRef',
}

// ING-DiBa CSV export columns
const ING_COLUMNS: Record<string, keyof RawTransaction | string> = {
  Buchung: 'date',
  Valuta: 'valueDate',
  'Auftraggeber/Empfänger': 'recipient',
  Buchungstext: 'category',
  Verwendungszweck: 'description',
  Saldo: 'balance',
  Währung: 'currency',
  Betrag: 'amount',
}

// Sparkasse/generic German bank columns
const SPARKASSE_COLUMNS: Record<string, keyof RawTransaction | string> = {
  Buchungstag: 'date',
  Valutadatum: 'valueDate',
  Buchungstext: 'category',
  Verwendungszweck: 'description',
  'Beguenstigter/Zahlungspflichtiger': 'recipient',
  Kontonummer: 'recipientIban',
  BLZ: 'bankCode',
  Betrag: 'amount',
  Waehrung: 'currency',
}

// Generic English column mappings (fallback)
const ENGLISH_COLUMNS: Record<string, keyof RawTransaction | string> = {
  Date: 'date',
  'Booking Date': 'date',
  'Transaction Date': 'date',
  'Value Date': 'valueDate',
  Amount: 'amount',
  Currency: 'currency',
  Description: 'description',
  Recipient: 'recipient',
  Payee: 'recipient',
  IBAN: 'recipientIban',
  Category: 'category',
  Reference: 'referenceAccount',
  Memo: 'description',
  Notes: 'description',
}

// Combine all column mappings (order matters - more specific first)
const ALL_COLUMN_MAPPINGS = [
  FINANZGURU_COLUMNS,
  N26_COLUMNS,
  DKB_COLUMNS,
  ING_COLUMNS,
  SPARKASSE_COLUMNS,
  ENGLISH_COLUMNS,
]

export function normalizeColumnName(header: string): string {
  for (const mapping of ALL_COLUMN_MAPPINGS) {
    if (header in mapping) {
      return mapping[header] as string
    }
  }

  return header.toLowerCase().replace(/[^a-z0-9]/g, '_')
}
