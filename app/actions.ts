'use server'

import { auth } from '@/lib/auth'
import { addExpense, updateExpense, deleteExpense, getAllExpenses, invalidateExpensesCache, type Expense } from '@/lib/expenses'
import { addSettingValue, addSettingValues, deleteSettingValue, invalidateSettingsCache, type SettingsData } from '@/lib/settings'
import { revalidatePath } from 'next/cache'
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
 * Verify the given rowIndex actually corresponds to an existing expense row.
 * Prevents an authenticated user from passing an arbitrary integer (e.g. 1 to
 * overwrite the header row, or any rowIndex to mutate another user's data).
 */
async function requireValidRowIndex(rowIndex: number) {
  if (!Number.isInteger(rowIndex) || rowIndex < 2) throw new Error('Invalid rowIndex')
  const all = await getAllExpenses()
  if (!all.find(e => e.rowIndex === rowIndex)) throw new Error('Expense not found')
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
  revalidatePath('/')
  revalidatePath('/expenses')
  revalidatePath('/settings')
}

export async function updateExpenseAction(rowIndex: number, data: Omit<Expense, 'rowIndex'>) {
  await requireAuth()
  validateExpenseData(data)
  await requireValidRowIndex(rowIndex)
  await Promise.all([updateExpense(rowIndex, data), promoteLookupValues(data)])
  invalidateExpensesCache()
  invalidateSettingsCache()
  revalidatePath('/')
  revalidatePath('/expenses')
  revalidatePath('/settings')
}

export async function deleteExpenseAction(rowIndex: number) {
  await requireAuth()
  await requireValidRowIndex(rowIndex)
  await deleteExpense(rowIndex)
  invalidateExpensesCache()
  revalidatePath('/')
  revalidatePath('/expenses')
}

export async function addSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  await addSettingValue(column, value)
  invalidateSettingsCache()
  revalidatePath('/settings')
}

export async function deleteSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  await deleteSettingValue(column, value)
  invalidateSettingsCache()
  revalidatePath('/settings')
}
