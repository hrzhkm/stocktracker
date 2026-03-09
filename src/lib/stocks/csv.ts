type CsvRow = Record<string, string | number | null>

function escapeCsvValue(value: string | number | null) {
  if (value === null) {
    return ''
  }

  const stringValue = String(value)
  if (!/[",\n]/.test(stringValue)) {
    return stringValue
  }

  return `"${stringValue.replaceAll('"', '""')}"`
}

export function buildCsv(rows: CsvRow[], columns: string[]) {
  const header = columns.join(',')
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column] ?? null)).join(','))
    .join('\n')

  return `${header}\n${body}`
}

export function createCsvHeaders(filename: string) {
  return {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store',
  }
}
