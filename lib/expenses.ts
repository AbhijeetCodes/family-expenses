import { getSheetsClient, SHEET_ID, EXPENSES_TAB } from './sheets'
import { format, parse, isValid } from 'date-fns'

export type Expense = {
  rowIndex: number   // 1-based sheet row
  date: string       // YYYY-MM-DD
  expenseType: string
  app: string
  paymentMode: string
  name: string
  cost: number
  paidBy: string
  oneTime: boolean
  tags: string[]
}

// Column order in the sheet (0-indexed). Column A is Month (auto-computed), data starts at B.
const COL = {
  month: 0,
  date: 1,
  expenseType: 2,
  app: 3,
  paymentMode: 4,
  name: 5,
  cost: 6,
  paidBy: 7,
  oneTime: 8,
  tags: 9,
}

function rowToExpense(row: string[], rowIndex: number): Expense {
  const raw = (i: number) => row[i] ?? ''
  const costVal = parseFloat(raw(COL.cost).replace(/,/g, ''))
  return {
    rowIndex,
    date: normaliseDate(raw(COL.date)),
    expenseType: raw(COL.expenseType),
    app: raw(COL.app),
    paymentMode: raw(COL.paymentMode),
    name: raw(COL.name),
    cost: isNaN(costVal) ? 0 : costVal,
    paidBy: raw(COL.paidBy),
    oneTime: raw(COL.oneTime).toUpperCase() === 'TRUE' || raw(COL.oneTime) === '1',
    tags: raw(COL.tags) ? raw(COL.tags).split(',').map(t => t.trim()).filter(Boolean) : [],
  }
}

function normaliseDate(raw: string): string {
  if (!raw) return ''
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // Try DD/MM/YYYY or MM/DD/YYYY
  for (const fmt of ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd', 'd-MMM-yyyy', 'MMM d, yyyy']) {
    const d = parse(raw, fmt, new Date())
    if (isValid(d)) return format(d, 'yyyy-MM-dd')
  }
  // Google serial date
  const n = Number(raw)
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400 * 1000)
    return format(d, 'yyyy-MM-dd')
  }
  return raw
}

function expenseToRow(e: Omit<Expense, 'rowIndex'>): string[] {
  return [
    e.date.slice(0, 7),   // Month column (YYYY-MM)
    e.date,
    e.expenseType,
    e.app,
    e.paymentMode,
    e.name,
    String(e.cost),
    e.paidBy,
    e.oneTime ? 'TRUE' : 'FALSE',
    e.tags.join(', '),
  ]
}

export async function getAllExpenses(): Promise<Expense[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A:J`,
  })
  const rows = res.data.values ?? []
  // Skip header row (row 1 → rowIndex 1, data starts at index 1 in array = rowIndex 2)
  return rows.slice(1).map((row, i) => rowToExpense(row as string[], i + 2))
}

export async function addExpense(e: Omit<Expense, 'rowIndex'>): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A:J`,
    valueInputOption: 'RAW',
    requestBody: { values: [expenseToRow(e)] },
  })
}

export async function updateExpense(rowIndex: number, e: Omit<Expense, 'rowIndex'>): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A${rowIndex}:J${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [expenseToRow(e)] },
  })
}

export async function deleteExpense(rowIndex: number): Promise<void> {
  const sheets = getSheetsClient()
  // Get spreadsheet to find the Expenses sheet sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === EXPENSES_TAB)
  const sheetId = sheet?.properties?.sheetId ?? 0
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,  // 0-based
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}
