import { google, sheets_v4 } from 'googleapis'

interface CategoryValue {
  column: string;
  value: number;
}

interface ExportData {
  sheetId: string;
  tabName: string;
  month: string;
  monthFormat: 'short' | 'long' | 'numeric';
  categoryValues: CategoryValue[];
  income: number;
  savings?: number;
  investment?: number;
  constantColumns?: string[];
}

interface ExportResult {
  success: boolean;
  updatedCells: number;
  rowNumber: number;
}

// Sheet column mapping (matching user's sheet structure)
const SHEET_COLUMNS = {
  MONTH: 'A',
  RENT: 'B',
  EATING_OUT: 'C',
  PERSONAL_ENTERTAINMENT: 'D',
  SUBSCRIPTIONS: 'E',
  CAR: 'F',
  PUBLIC_TRANSPORT: 'G',
  INTERNET: 'H',
  ELECTRICITY: 'I',
  INSURANCE: 'J',
  TRAVEL: 'K',
  GROCERIES: 'L',
  FAMILY: 'M',
  RADIO_TAX: 'N',
  HEALTH_WELLBEING: 'O',
  SHOPPING: 'P',
  OTHER: 'Q',
  GIFTS: 'R',
  TOTAL_EXPENDITURE: 'S',  // Formula - don't overwrite
  INCOME: 'T',
  INCOME_AFTER_EXPENDITURE: 'U',  // Formula - don't overwrite
  GROSS_SAVINGS: 'V',
  GROSS_INVESTMENT: 'W',
  NET_INCOME: 'X',  // Formula - don't overwrite
};

async function getAuthClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  
  if (!keyPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH not configured');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth.getClient();
}

async function findMonthRow(
  sheets: sheets_v4.Sheets,
  sheetId: string,
  tabName: string,
  month: string
): Promise<number> {
  // Get column A (month column) data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A:A`,
  });

  const values = response.data.values || [];
  const monthLower = month.toLowerCase();
  
  // Find matching month row
  // Matches: "July 2025", "Jul 2025", "07/2025", etc.
  for (let i = 0; i < values.length; i++) {
    const cellValue = values[i]?.[0]?.toString().toLowerCase();
    if (!cellValue) continue;
    
    // Check for exact match or partial match
    if (cellValue === monthLower || cellValue.includes(monthLower)) {
      return i + 1; // 1-indexed row number
    }
    
    // Also try matching just the month name
    const monthName = month.split(' ')[0]?.toLowerCase();
    if (monthName && cellValue.includes(monthName)) {
      // Verify year matches if present
      const year = month.split(' ')[1];
      if (!year || cellValue.includes(year)) {
        return i + 1;
      }
    }
  }

  throw new Error(`Month "${month}" not found in sheet. Please ensure the row exists in column A.`);
}

export async function exportToSheets(data: ExportData): Promise<ExportResult> {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient as any });

  // Find the row for the specified month
  const rowNumber = await findMonthRow(
    sheets,
    data.sheetId,
    data.tabName,
    data.month
  );

  // Prepare batch update data
  const updateData: sheets_v4.Schema$ValueRange[] = [];
  const constantCols = new Set(data.constantColumns || ['S', 'U', 'X']); // Default: skip formula columns

  // Add category values (B-R)
  for (const { column, value } of data.categoryValues) {
    // Skip constant/formula columns
    if (constantCols.has(column)) {
      continue;
    }

    updateData.push({
      range: `${data.tabName}!${column}${rowNumber}`,
      values: [[value]],
    });
  }

  // Add Income to column T (not S!)
  if (!constantCols.has('T')) {
    updateData.push({
      range: `${data.tabName}!${SHEET_COLUMNS.INCOME}${rowNumber}`,
      values: [[data.income]],
    });
  }

  // Add Gross Savings to column V if provided
  if (data.savings !== undefined && !constantCols.has('V')) {
    updateData.push({
      range: `${data.tabName}!${SHEET_COLUMNS.GROSS_SAVINGS}${rowNumber}`,
      values: [[data.savings]],
    });
  }

  // Add Gross Investment to column W if provided
  if (data.investment !== undefined && !constantCols.has('W')) {
    updateData.push({
      range: `${data.tabName}!${SHEET_COLUMNS.GROSS_INVESTMENT}${rowNumber}`,
      values: [[data.investment]],
    });
  }

  if (updateData.length === 0) {
    return {
      success: true,
      updatedCells: 0,
      rowNumber,
    };
  }

  // Execute batch update
  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: data.sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updateData,
    },
  });

  return {
    success: true,
    updatedCells: response.data.totalUpdatedCells || 0,
    rowNumber,
  };
}

export async function getSheetMetadata(sheetId: string) {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient as any });

  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });

  return {
    title: response.data.properties?.title,
    sheets: response.data.sheets?.map(s => ({
      title: s.properties?.title,
      index: s.properties?.index,
    })),
  };
}

// Verify sheet structure matches expected format
export async function verifySheetStructure(sheetId: string, tabName: string): Promise<{
  valid: boolean;
  headers: string[];
  issues: string[];
}> {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient as any });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:X1`,
  });

  const headers = (response.data.values?.[0] || []).map((h: string) => h?.toString() || '');
  const issues: string[] = [];

  const expectedHeaders = [
    'Month', 'Rent', 'Eating Out', 'Personal Entertainment', 'Subscriptions',
    'Car', 'Public Transport', 'Internet', 'Electricity', 'Insurance',
    'Travel', 'Groceries', 'Family', 'Radio Tax', 'Health & Wellbeing',
    'Shopping', 'Other', 'Gifts', 'Total Expenditure', 'Income',
    'Income After Expenditure', 'Gross Savings', 'Gross Investment', 'Net Income'
  ];

  for (let i = 0; i < expectedHeaders.length; i++) {
    const expected = expectedHeaders[i].toLowerCase();
    const actual = headers[i]?.toLowerCase() || '';
    
    if (!actual.includes(expected.split(' ')[0])) {
      issues.push(`Column ${String.fromCharCode(65 + i)}: expected "${expectedHeaders[i]}", found "${headers[i] || '(empty)'}"`);
    }
  }

  return {
    valid: issues.length === 0,
    headers,
    issues,
  };
}
