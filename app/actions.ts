'use server'

import { auth } from '@/lib/auth'
import { addExpense, updateExpense, deleteExpense, type Expense } from '@/lib/expenses'
import { addSettingValue, addSettingValues, deleteSettingValue, type SettingsData } from '@/lib/settings'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAuth() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
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
  await addExpense(data)
  await promoteLookupValues(data)
  revalidatePath('/')
  revalidatePath('/expenses')
  revalidatePath('/settings')
}

export async function updateExpenseAction(rowIndex: number, data: Omit<Expense, 'rowIndex'>) {
  await requireAuth()
  await updateExpense(rowIndex, data)
  await promoteLookupValues(data)
  revalidatePath('/')
  revalidatePath('/expenses')
  revalidatePath('/settings')
}

export async function deleteExpenseAction(rowIndex: number) {
  await requireAuth()
  await deleteExpense(rowIndex)
  revalidatePath('/')
  revalidatePath('/expenses')
}

export async function addSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  await addSettingValue(column, value)
  revalidatePath('/settings')
}

export async function deleteSettingAction(column: keyof SettingsData, value: string) {
  await requireAuth()
  await deleteSettingValue(column, value)
  revalidatePath('/settings')
}
