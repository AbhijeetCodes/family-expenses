import { after } from 'next/server'
import { getSheetsClient, getTabSheetId, SHEET_ID, EXPENSES_TAB } from './sheets'
import { format, parse, isValid } from 'date-fns'

/*
 * Stale-while-revalidate cache (per serverless instance).
 *
 *   age < FRESH_MS       → serve from memory, no Sheets call
 *   age < MAX_STALE_MS   → serve from memory instantly, refresh in background
 *   older / no cache     → block on a Sheets read
 *
 * So page renders almost never wait on Sheets, while edits made directly in
 * the sheet are picked up within seconds: <LiveSync> on the client polls
 * getExpensesVersion(), which forces a fresh read, and calls router.refresh()
 * when the version it rendered with is out of date.
 *
 * App writes patch the cache in place (see patchCache) instead of dropping
 * it, so the page you land on after saving renders straight from memory.
 */
const envMs = (name: string, fallback: number) => {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}
export const FRESH_MS     = envMs('EXPENSES_CACHE_TTL_MS', 5_000)
const MAX_STALE_MS        = envMs('EXPENSES_MAX_STALE_MS', 5 * 60_000)

type CacheEntry = {
  data: Expense[]
  version: string
  fetchedAt: number
  /** Set after an in-place patch: data is right but unconfirmed by Sheets. */
  stale: boolean
}
let _expensesCache: CacheEntry | null = null
// Coalesces concurrent fetches: the second caller awaits the first's
// in-flight promise instead of firing a duplicate Sheets request.
let _expensesInFlight: { promise: Promise<CacheEntry>; gen: number } | null = null
// Bumped on every write. A fetch that started before a write must not
// overwrite the (newer) patched cache when it lands.
let _generation = 0

export function invalidateExpensesCache(): void {
  _generation++
  _expensesCache = null
}

/**
 * FNV-1a over every field of every row — cheap change detection for polling.
 * Fields are serialised in a fixed order so a patched row and the same row
 * re-read from Sheets hash identically.
 */
function versionOf(data: Expense[]): string {
  let h = 0x811c9dc5
  for (const e of data) {
    const line = `${e.rowIndex}\u0001${e.date}\u0001${e.expenseType}\u0001${e.app}\u0001${e.paymentMode}\u0001${e.name}\u0001${e.cost}\u0001${e.paidBy}\u0001${e.oneTime}\u0001${e.tags.join(',')}\n`
    for (let i = 0; i < line.length; i++) {
      h ^= line.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
  }
  return `${data.length}-${(h >>> 0).toString(36)}`
}

/** Copy only the known fields (the action payload may carry extras). */
function toRow(e: Omit<Expense, 'rowIndex'>, rowIndex: number): Expense {
  return {
    rowIndex,
    date: e.date,
    expenseType: e.expenseType,
    app: e.app,
    paymentMode: e.paymentMode,
    name: e.name,
    cost: e.cost,
    paidBy: e.paidBy,
    oneTime: e.oneTime,
    tags: e.tags.map(t => t.trim()).filter(Boolean),
  }
}

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
  const rawCost = raw(COL.cost)
  // Strip currency symbols / thousands separators from sheet-formatted cells.
  const costVal = parseFloat(rawCost.replace(/[^0-9.\-]/g, ''))
  // Surface bad data — silent 0s hide bugs (e.g. a row where the cost column
  // got an accidental letter). Empty cells are normal, so don't warn on those.
  if (rawCost.trim() !== '' && isNaN(costVal)) {
    console.warn(`[expenses] row ${rowIndex}: could not parse cost ${JSON.stringify(rawCost)} — defaulting to 0`)
  }
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

// Cost and the one-time flag are sent as a real number / boolean so they land
// in the sheet as numeric / TRUE-FALSE cells (SUM and filters work on them).
// RAW still guarantees nothing is ever parsed as a formula.
function expenseToRow(e: Omit<Expense, 'rowIndex'>): (string | number | boolean)[] {
  return [
    e.date.slice(0, 7),   // Month column (YYYY-MM)
    e.date,
    e.expenseType,
    e.app,
    e.paymentMode,
    e.name,
    e.cost,
    e.paidBy,
    e.oneTime,
    e.tags.join(', '),
  ]
}

function fetchExpenses(): Promise<CacheEntry> {
  // Join an in-flight read only if no write has landed since it started —
  // otherwise it may predate the write and we need a fresh one.
  if (_expensesInFlight && _expensesInFlight.gen === _generation) return _expensesInFlight.promise
  const gen = _generation
  const promise: Promise<CacheEntry> = (async () => {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!A:J`,
    })
    const rows = res.data.values ?? []
    // Skip header row (row 1 → rowIndex 1, data starts at index 1 in array = rowIndex 2)
    const data = rows.slice(1).map((row, i) => rowToExpense(row as string[], i + 2))
    const entry: CacheEntry = { data, version: versionOf(data), fetchedAt: Date.now(), stale: false }
    // Only publish if no write happened while we were reading.
    if (gen === _generation) _expensesCache = entry
    return entry
  })().finally(() => {
    if (_expensesInFlight?.promise === promise) _expensesInFlight = null
  })
  _expensesInFlight = { promise, gen }
  return promise
}

function revalidateInBackground() {
  const p = fetchExpenses().catch(err => console.error('[expenses] background refresh failed', err))
  // Keep the serverless function alive until the refresh lands. `after` throws
  // outside a request scope — the promise still runs, which is fine.
  try { after(p) } catch { /* not in a request */ }
}

async function getEntry(): Promise<CacheEntry> {
  const c = _expensesCache
  if (c) {
    const age = Date.now() - c.fetchedAt
    if (!c.stale && age < FRESH_MS) return c
    if (age < MAX_STALE_MS) {
      revalidateInBackground()
      return c
    }
  }
  return fetchExpenses()
}

export async function getAllExpenses(): Promise<Expense[]> {
  return (await getEntry()).data
}

/** Version of the data a page was rendered with — passed to <LiveSync>. */
export async function getExpensesWithVersion(): Promise<{ data: Expense[]; version: string }> {
  const { data, version } = await getEntry()
  return { data, version }
}

/**
 * Version of what's in the sheet *now* (at most `maxAgeMs` old). Used by the
 * client poll, so it waits for a real read rather than serving stale memory.
 */
export async function getExpensesVersion(maxAgeMs = 3_000): Promise<string> {
  const c = _expensesCache
  if (c && !c.stale && Date.now() - c.fetchedAt < maxAgeMs) return c.version
  return (await fetchExpenses()).version
}

/** Apply an app write to the in-memory cache so the next render needs no Sheets read. */
function patchCache(fn: (data: Expense[]) => Expense[]) {
  _generation++
  const c = _expensesCache
  if (!c) return
  const data = fn(c.data)
  _expensesCache = { data, version: versionOf(data), fetchedAt: c.fetchedAt, stale: true }
}

export async function addExpense(e: Omit<Expense, 'rowIndex'>): Promise<void> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A:J`,
    valueInputOption: 'RAW',
    requestBody: { values: [expenseToRow(e)] },
  })
  // updatedRange looks like "Expenses!A124:J124" → the new row's index.
  const m = res.data.updates?.updatedRange?.match(/![A-Z]+(\d+):/)
  const rowIndex = m ? Number(m[1]) : NaN
  if (!Number.isInteger(rowIndex)) return invalidateExpensesCache()
  patchCache(data => [...data.filter(x => x.rowIndex !== rowIndex), toRow(e, rowIndex)])
}

export async function updateExpense(rowIndex: number, e: Omit<Expense, 'rowIndex'>): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A${rowIndex}:J${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [expenseToRow(e)] },
  })
  patchCache(data => data.map(x => (x.rowIndex === rowIndex ? toRow(e, rowIndex) : x)))
}

export async function deleteExpense(rowIndex: number): Promise<void> {
  const sheets = getSheetsClient()
  const sheetId = await getTabSheetId(EXPENSES_TAB)
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
  // Rows below the deleted one shift up by one, exactly as in the sheet.
  patchCache(data => data
    .filter(x => x.rowIndex !== rowIndex)
    .map(x => (x.rowIndex > rowIndex ? { ...x, rowIndex: x.rowIndex - 1 } : x)))
}
