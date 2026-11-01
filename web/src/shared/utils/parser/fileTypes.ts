const SUPPORTED_FILE_TYPES = {
  csv: ['.csv', 'text/csv', 'application/csv'],
  excel: [
    '.xlsx',
    '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  ofx: ['.ofx', '.qfx', 'application/x-ofx'],
}

export function getSupportedExtensions(): string {
  return '.csv, .xlsx, .xls, .ofx, .qfx'
}

export function isFileSupported(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const type = file.type.toLowerCase()

  return Object.values(SUPPORTED_FILE_TYPES).some(types => types.some(t => t === ext || t === type))
}

export function getFileType(file: File): 'csv' | 'excel' | 'ofx' | 'unknown' {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const type = file.type.toLowerCase()

  if (SUPPORTED_FILE_TYPES.csv.some(t => t === ext || t === type)) return 'csv'
  if (SUPPORTED_FILE_TYPES.excel.some(t => t === ext || t === type)) return 'excel'
  if (SUPPORTED_FILE_TYPES.ofx.some(t => t === ext || t === type)) return 'ofx'

  return 'unknown'
}
