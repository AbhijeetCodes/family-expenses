import { getSheetsClient, SHEET_ID, SETTINGS_TAB } from './sheets'

export type SettingsData = {
  expenseTypes: string[]
  apps: string[]
  paymentModes: string[]
  paidBy: string[]
  tags: string[]
}

// Column positions in Settings tab (0-indexed)
const COLS = {
  expenseTypes: 0,
  apps: 1,
  paymentModes: 2,
  paidBy: 3,
  tags: 4,
}

const COL_HEADERS = ['ExpenseTypes', 'Apps', 'PaymentModes', 'PaidBy', 'Tags']

export async function getSettings(): Promise<SettingsData> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!A:E`,
  })
  const rows = (res.data.values ?? []) as string[][]
  const extract = (colIdx: number) =>
    rows.slice(1).map(r => r[colIdx] ?? '').filter(Boolean)

  return {
    expenseTypes: extract(COLS.expenseTypes),
    apps: extract(COLS.apps),
    paymentModes: extract(COLS.paymentModes),
    paidBy: extract(COLS.paidBy),
    tags: extract(COLS.tags),
  }
}

export async function addSettingValue(
  column: keyof typeof COLS,
  value: string
): Promise<void> {
  const settings = await getSettings()
  const current = settings[column]
  if (current.map(s => s.toLowerCase()).includes(value.toLowerCase())) return

  const sheets = getSheetsClient()
  const colLetter = String.fromCharCode(65 + COLS[column]) // A=0, B=1 ...
  const nextRow = current.length + 2 // +1 for header, +1 for next empty row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!${colLetter}${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}

export async function deleteSettingValue(
  column: keyof typeof COLS,
  value: string
): Promise<void> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!A:E`,
  })
  const rows = (res.data.values ?? []) as string[][]
  const colIdx = COLS[column]
  const colLetter = String.fromCharCode(65 + colIdx)

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][colIdx] ?? '').toLowerCase() === value.toLowerCase()) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${SETTINGS_TAB}!${colLetter}${i + 1}`,
      })
      break
    }
  }
}

export async function ensureSettingsTab(): Promise<void> {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const exists = meta.data.sheets?.some(s => s.properties?.title === SETTINGS_TAB)
  if (exists) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: SETTINGS_TAB } } }],
    },
  })
  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!A1:E1`,
    valueInputOption: 'RAW',
    requestBody: { values: [COL_HEADERS] },
  })
}
