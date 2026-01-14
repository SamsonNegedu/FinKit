import { Transaction, SheetConfig, ExportPreviewData } from '../types'

const API_BASE = '/api'

interface CategorizeResponse {
  success: boolean;
  data: Array<{
    id: string;
    category: string;
    merchant?: string;
  }>;
}

interface ExportResponse {
  success: boolean;
  data: {
    updatedCells: number;
    rowNumber: number;
  };
}

export async function categorizeWithAI(transactions: Transaction[]): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE}/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: transactions.map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.type === 'expense' ? -tx.amount : tx.amount,
        date: tx.date,
        category: tx.category,
      }))
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to categorize transactions')
  }

  const result: CategorizeResponse = await response.json()
  
  // Merge AI results with existing transactions
  const categorizedMap = new Map(result.data.map(item => [item.id, item]))
  
  return transactions.map(tx => {
    const aiResult = categorizedMap.get(tx.id)
    if (aiResult) {
      return {
        ...tx,
        category: aiResult.category,
        merchant: aiResult.merchant || tx.merchant,
        categorySource: 'ai' as const,
      }
    }
    return tx
  })
}

export async function exportToSheets(
  transactions: Transaction[],
  config: SheetConfig,
  month: string
): Promise<ExportResponse> {
  // Aggregate transactions by category
  const categoryTotals = new Map<string, number>()
  let totalIncome = 0
  
  for (const tx of transactions) {
    if (tx.category === 'Transfer' || tx.isExcluded) continue
    
    if (tx.type === 'income') {
      totalIncome += tx.amount
    } else {
      const sheetColumn = config.categoryMappings.find(
        m => m.appCategory === tx.category
      )?.sheetColumn
      
      if (sheetColumn) {
        categoryTotals.set(
          sheetColumn,
          (categoryTotals.get(sheetColumn) || 0) + tx.amount
        )
      }
    }
  }
  
  const categoryValues = Array.from(categoryTotals.entries()).map(([column, value]) => ({
    column,
    value: Math.round(value * 100) / 100,
  }))
  
  const response = await fetch(`${API_BASE}/export/sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sheetId: config.sheetId,
      tabName: config.tabName,
      month,
      monthFormat: config.monthFormat,
      categoryValues,
      income: Math.round(totalIncome * 100) / 100,
      constantColumns: config.constantColumns,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to export to Google Sheets')
  }

  return response.json()
}

export function generateExportPreview(
  transactions: Transaction[],
  config: SheetConfig,
  month: string
): ExportPreviewData {
  const categoryTotals = new Map<string, number>()
  let totalIncome = 0
  let totalExpenditure = 0
  
  for (const tx of transactions) {
    if (tx.category === 'Transfer' || tx.isExcluded) continue
    
    if (tx.type === 'income') {
      totalIncome += tx.amount
    } else {
      totalExpenditure += tx.amount
      
      const sheetColumn = config.categoryMappings.find(
        m => m.appCategory === tx.category
      )?.sheetColumn
      
      if (sheetColumn) {
        categoryTotals.set(
          sheetColumn,
          (categoryTotals.get(sheetColumn) || 0) + tx.amount
        )
      }
    }
  }
  
  // Build columns array with constant indication
  const constantSet = new Set(config.constantColumns || [])
  const columns = config.categoryMappings.map(mapping => ({
    name: mapping.sheetColumn,
    value: Math.round((categoryTotals.get(mapping.sheetColumn) || 0) * 100) / 100,
    isConstant: constantSet.has(mapping.sheetColumn),
  }))
  
  return {
    month,
    columns,
    totalExpenditure: Math.round(totalExpenditure * 100) / 100,
    income: Math.round(totalIncome * 100) / 100,
  }
}
