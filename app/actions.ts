'use server'

import { auth } from '@/lib/auth'
import { addExpense, updateExpense, deleteExpense, invalidateExpensesCache, type Expense } from '@/lib/expenses'
import { addSettingValue, addSettingValues, deleteSettingValue, invalidateSettingsCache, type SettingsData } from '@/lib/settings'
import { redirect } from 'next/navigation'

async function requireAuth() {
  const session = await auth()
  if (!session) redirect('/login')
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
 * header) or a negative/garbage value. We deliberately don't re-fetch the
 * whole sheet to confirm the row exists: all ALLOWED_EMAILS users are
 * trusted family members sharing one sheet, and the underlying Sheets API
 * surfaces real out-of-range errors on delete.
 */
function assertValidRowIndex(rowIndex: number): void {
  if (!Number.isInteger(rowIndex) || rowIndex < 2) throw new Error('Invalid rowIndex')
}

// Auto-promote any freeform Type / App / Mode the user typed into the form so it
// shows up as a datalist suggestion next time. PaidBy and Tags stay curated.
async function promoteLookupValues(data: Omit<Expense, 'rowIndex'>) {
  await addSettingValues([
    { column: 'expenseTypes', value: data.expenseType },
    { column: 'apps',         value: data.app },
    { column: 'paymentModes', value: data.paymentMode },
  ])
}

export async function createExpenseAction(data: Omit<Expense, 'rowIndex'>) {
  await requireAuth()
  validateExpenseData(data)
  await Promise.all([addExpense(data), promoteLookupValues(data)])
  invalidateExpensesCache()
  invalidateSettingsCache()
}

export async function updateExpenseAction(rowIndex: number, data: Omit<Expense, 'rowIndex'>) {
  await requireAuth()
  validateExpenseData(data)
  assertValidRowIndex(rowIndex)
  await Promise.all([updateExpense(rowIndex, data), promoteLookupValues(data)])
  invalidateExpensesCache()
  invalidateSettingsCache()
}

export async function deleteExpenseAction(rowIndex: number) {
  await requireAuth()
  assertValidRowIndex(rowIndex)
  await deleteExpense(rowIndex)
  invalidateExpensesCache()
}

export async function addSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  await addSettingValue(column, value)
  invalidateSettingsCache()
}

export async function deleteSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  await deleteSettingValue(column, value)
  invalidateSettingsCache()
}
