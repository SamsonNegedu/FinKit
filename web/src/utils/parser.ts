import { Transaction } from '../types';
import Papa from 'papaparse';
import { normalizeColumnNames, anonymizeTransaction } from './anonymizer';
import * as XLSX from 'xlsx';

interface RawTransaction {
  date?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  amount?: string;
  currency?: string;
  [key: string]: string | undefined;
}

// Parse German date format (DD.MM.YYYY) to ISO string
const parseGermanDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Handle Excel date format (number of days since 1900-01-01)
  if (!isNaN(Number(dateStr))) {
    const date = new Date((Number(dateStr) - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Handle German date format (DD.MM.YYYY)
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
};

// Parse amount string to number, handling both German and US formats
const parseAmount = (amountStr: string): number => {
  if (!amountStr) return 0;
  
  // Remove any currency symbols and spaces
  amountStr = amountStr.replace(/[^\d.,-]/g, '');
  
  // Check if the number uses German format (1.234,56) or US format (1,234.56)
  const hasGermanFormat = amountStr.includes(',') && 
    (amountStr.indexOf(',') > amountStr.indexOf('.') || !amountStr.includes('.'));
  
  if (hasGermanFormat) {
    // German format: 1.234,56 -> 1234.56
    return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
  } else {
    // US format: 1,234.56 -> 1234.56
    return parseFloat(amountStr.replace(/,/g, ''));
  }
};

// Parse CSV data into Transaction objects
export const parseCSV = (csvData: string): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const normalized = normalizeColumnNames([header])[0];
        return normalized;
      },
      complete: (results) => {
        try {
          const transactions: Transaction[] = (results.data as RawTransaction[]).map((row, index) => {
            // Anonymize sensitive data
            const anonymized = anonymizeTransaction(row);
            
            // Extract and format data
            const date = parseGermanDate(anonymized.date || '');
            const description = anonymized.description || '';
            const category = anonymized.category || (row.subcategory || 'Uncategorized');
            const amountStr = String(anonymized.amount || '0');
            const currency = anonymized.currency || 'EUR'; // Default to EUR if not specified
            
            // Parse amount and determine type
            let amount = parseAmount(amountStr);
            const type = amount < 0 ? 'expense' : 'income';
            
            // Make expenses positive for easier calculations
            amount = Math.abs(amount);
            
            // Validate required fields
            if (!date || isNaN(amount) || amount === 0) {
              return null;
            }
            
            return {
              id: `transaction-${index}-${Date.now()}`,
              date,
              description,
              category,
              amount,
              type,
              currency
            };
          }).filter((transaction): transaction is Transaction => 
            transaction !== null
          );
          
          if (transactions.length === 0) {
            reject(new Error('No valid transactions found in the file. Please check the file format.'));
            return;
          }
          
          resolve(transactions);
        } catch (error) {
          reject(new Error(`Failed to parse CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: () => {
        reject(new Error('Failed to parse CSV file. Please check the file format.'));
      }
    });
  });
};

export const parseExcel = async (file: File): Promise<Transaction[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    
    if (jsonData.length < 2) {
      throw new Error('No data found in the Excel file.');
    }
    
    // Get headers and normalize them
    const headers = jsonData[0].map(header => normalizeColumnNames([header])[0]);
    
    // Convert rows to objects with normalized headers
    const rows = jsonData.slice(1).map(row => {
      const obj: RawTransaction = {};
      headers.forEach((header, index) => {
        obj[header] = row[index]?.toString();
      });
      return obj;
    });
    
    // Convert to CSV format and use existing CSV parser
    const csvData = Papa.unparse(rows);
    return parseCSV(csvData);
  } catch {
    throw new Error('Failed to parse Excel file. Please check the file format.');
  }
};

export const detectFileType = (file: File): 'csv' | 'excel' | 'unknown' => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return 'csv';
  } else if (['xls', 'xlsx'].includes(extension || '')) {
    return 'excel';
  }
  
  return 'unknown';
};
