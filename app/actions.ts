'use server'

import { auth } from '@/lib/auth'
import { addExpense, updateExpense, deleteExpense, getExpensesVersion, RowConflictError, type Expense } from '@/lib/expenses'
import { addSettingValue, addSettingValues, deleteSettingValue, invalidateSettingsCache, SETTINGS_COLUMNS, type SettingsData } from '@/lib/settings'
import { redirect } from 'next/navigation'

// Check for a user, not just a session object: Auth.js can hand back a
// session populated with an error, which a bare `if (!session)` lets through.
async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

/** Basic type + length guards on user-submitted expense data. */
function validateExpenseData(data: Omit<Expense, 'rowIndex'>) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0 || data.name.length > 500)
    throw new Error('Invalid name')
  if (typeof data.cost !== 'number' || isNaN(data.cost) || data.cost < 0 || data.cost > 10_000_000)
    throw new Error('Invalid cost')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date))
    throw new Error('Invalid date')
  if (data.expenseType && data.expenseType.length > 200) throw new Error('Expense type too long')
  if (data.app && data.app.length > 200)               throw new Error('App name too long')
  if (data.paymentMode && data.paymentMode.length > 200) throw new Error('Payment mode too long')
  if (!Array.isArray(data.tags) || data.tags.length > 20) throw new Error('Invalid tags')
}

/**
 * Cheap, sync check: rowIndex must be a positive integer >= 2 (row 1 is the
 * header). Prevents an authenticated user from passing 1 (overwriting the
 * header) or a negative/garbage value. That the row still holds the expense
 * the user opened is checked against the sheet by updateExpense /
 * deleteExpense themselves.
 */
function assertValidRowIndex(rowIndex: number): void {
  if (!Number.isInteger(rowIndex) || rowIndex < 2) throw new Error('Invalid rowIndex')
}

/**
 * Expected failures come back as values: Next.js replaces thrown error
 * messages with a generic one in production, so the form couldn't say why.
 */
export type ActionResult = { error?: string }

const CONFLICT_MESSAGE =
  'This expense was changed or moved in the sheet since you opened it. Go back and open it again.'

// Auto-promote any freeform Type / App / Mode the user typed that wasn't
// already a known datalist value, so it appears as a suggestion next time.
// PaidBy and Tags stay curated.
//
// `newLookups` is a pre-filtered set computed client-side from the existing
// settings — empty when the user picked existing datalist values, in which
// case we skip the Settings read+write entirely.
type NewLookups = Partial<Pick<Expense, 'expenseType' | 'app' | 'paymentMode'>>

async function promoteLookupValues(values: NewLookups) {
  const entries: { column: 'expenseTypes' | 'apps' | 'paymentModes'; value: string }[] = []
  if (values.expenseType) entries.push({ column: 'expenseTypes', value: values.expenseType })
  if (values.app)         entries.push({ column: 'apps',         value: values.app })
  if (values.paymentMode) entries.push({ column: 'paymentModes', value: values.paymentMode })
  if (!entries.length) return
  await addSettingValues(entries)
}

/** `isRetry`: the previous attempt at this submit failed with no answer — see addExpense. */
export async function createExpenseAction(
  data: Omit<Expense, 'rowIndex'>,
  newLookups: NewLookups = {},
  isRetry = false,
) {
  await requireAuth()
  validateExpenseData(data)
  const hasNewLookups = !!(newLookups.expenseType || newLookups.app || newLookups.paymentMode)
  await Promise.all([
    addExpense(data, { isRetry: isRetry === true }),
    hasNewLookups ? promoteLookupValues(newLookups) : Promise.resolve(),
  ])
  // addExpense / updateExpense patch the expenses cache in place themselves.
  if (hasNewLookups) invalidateSettingsCache()
}

/** `original` is the expense as the form loaded it — used to detect row shifts. */
export async function updateExpenseAction(
  rowIndex: number,
  original: Omit<Expense, 'rowIndex'>,
  data: Omit<Expense, 'rowIndex'>,
  newLookups: NewLookups = {},
): Promise<ActionResult> {
  await requireAuth()
  validateExpenseData(data)
  assertValidRowIndex(rowIndex)
  // Check the row before promoting lookups, so a conflict writes nothing.
  try {
    await updateExpense(rowIndex, data, original)
  } catch (err) {
    if (err instanceof RowConflictError) return { error: CONFLICT_MESSAGE }
    throw err
  }
  // addExpense / updateExpense patch the expenses cache in place themselves.
  if (newLookups.expenseType || newLookups.app || newLookups.paymentMode) {
    await promoteLookupValues(newLookups)
    invalidateSettingsCache()
  }
  return {}
}

export async function deleteExpenseAction(
  rowIndex: number,
  original: Omit<Expense, 'rowIndex'>,
): Promise<ActionResult> {
  await requireAuth()
  assertValidRowIndex(rowIndex)
  try {
    await deleteExpense(rowIndex, original)  // patches the expenses cache in place
  } catch (err) {
    if (err instanceof RowConflictError) return { error: CONFLICT_MESSAGE }
    throw err
  }
  return {}
}

/**
 * Polled by <LiveSync>: the version of the Expenses tab as it is in Sheets
 * right now (≤3 s old). The client compares it with the version its page was
 * rendered from and refreshes when they differ — this is how edits made
 * directly in the sheet show up in the app.
 */
export async function getExpensesVersionAction(): Promise<string> {
  await requireAuth()
  return getExpensesVersion()
}

/** Server actions are public endpoints — don't trust the client's types. */
function validateSetting(column: keyof SettingsData, value: string) {
  if (!SETTINGS_COLUMNS.includes(column)) throw new Error('Invalid settings column')
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('Invalid value')
}

export async function addSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  validateSetting(column, value)
  await addSettingValue(column, value)
  invalidateSettingsCache()
}

export async function deleteSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  validateSetting(column, value)
  await deleteSettingValue(column, value)
  invalidateSettingsCache()
}
