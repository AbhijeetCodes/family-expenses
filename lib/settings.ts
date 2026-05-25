import { getSheetsClient, SHEET_ID, SETTINGS_TAB } from './sheets'

export type SettingsData = {
  expenseTypes: string[]
  apps: string[]
  paymentModes: string[]
  paidBy: string[]
  tags: string[]
}

const CACHE_TTL_MS = 60_000
let _settingsCache: { data: SettingsData; expiresAt: number } | null = null
// Coalesces concurrent cache-miss fetches: second caller awaits the first's
// in-flight promise instead of firing a duplicate Sheets request.
let _settingsInFlight: Promise<SettingsData> | null = null

export function invalidateSettingsCache(): void {
  _settingsCache = null
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
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) return _settingsCache.data
  if (_settingsInFlight) return _settingsInFlight
  _settingsInFlight = (async () => {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SETTINGS_TAB}!A:E`,
    })
    const rows = (res.data.values ?? []) as string[][]
    const extract = (colIdx: number) =>
      rows.slice(1)
        .map(r => r[colIdx] ?? '')
        .filter(Boolean)
        .sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()))

    const data: SettingsData = {
      expenseTypes: extract(COLS.expenseTypes),
      apps: extract(COLS.apps),
      paymentModes: extract(COLS.paymentModes),
      paidBy: extract(COLS.paidBy),
      tags: extract(COLS.tags),
    }
    _settingsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    return data
  })().finally(() => { _settingsInFlight = null })
  return _settingsInFlight
}

// Internal: read the Settings tab as a 2D array (preserves sheet row order so we
// know where to append). Returns an empty 2D shape if the tab is empty.
async function readSettingsRaw(): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!A:E`,
  })
  return (res.data.values ?? []) as string[][]
}

function nextAppendRow(rows: string[][], colIdx: number): number {
  // 1-based row index of the first empty cell in this column, accounting for header.
  // We scan rows[1..] (data rows) to find the last non-empty cell, then return that + 2.
  let lastNonEmpty = 0 // 0 means only header present (or nothing)
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[colIdx] ?? '').trim() !== '') lastNonEmpty = i
  }
  return lastNonEmpty + 2 // +1 because rows is 0-indexed; +1 to move to the next empty row
}

function columnLetter(colIdx: number): string {
  return String.fromCharCode(65 + colIdx)
}

export async function addSettingValue(
  column: keyof typeof COLS,
  value: string
): Promise<void> {
  await addSettingValues([{ column, value }])
}

/**
 * Idempotently append one or more (column, value) pairs to the Settings tab.
 * - Single read of the tab, then a single batchUpdate write.
 * - Case-insensitive dedup against existing values.
 * - Handles same-call duplicates (e.g. two entries adding "Coffee" to the same column).
 */
export async function addSettingValues(
  entries: { column: keyof typeof COLS; value: string }[]
): Promise<void> {
  const clean = entries
    .map(e => ({ column: e.column, value: (e.value ?? '').trim() }))
    .filter(e => e.value !== '')
  if (!clean.length) return

  const rows = await readSettingsRaw()

  // Build a working view of existing lowercase values per column
  const existing: Record<string, Set<string>> = {}
  for (const key of Object.keys(COLS) as (keyof typeof COLS)[]) {
    const idx = COLS[key]
    existing[key] = new Set(
      rows.slice(1)
        .map(r => (r[idx] ?? '').trim().toLowerCase())
        .filter(Boolean)
    )
  }

  // Track next append row per column as we plan writes
  const nextRowFor: Record<string, number> = {}
  for (const key of Object.keys(COLS) as (keyof typeof COLS)[]) {
    nextRowFor[key] = nextAppendRow(rows, COLS[key])
  }

  const updates: { range: string; values: string[][] }[] = []
  for (const { column, value } of clean) {
    const lcv = value.toLowerCase()
    if (existing[column].has(lcv)) continue
    existing[column].add(lcv) // prevent same-call duplicates
    const letter = columnLetter(COLS[column])
    const row = nextRowFor[column]
    updates.push({ range: `${SETTINGS_TAB}!${letter}${row}`, values: [[value]] })
    nextRowFor[column] = row + 1
  }

  if (!updates.length) return

  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: updates },
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
