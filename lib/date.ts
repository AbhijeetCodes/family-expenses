import type { Expense } from './expenses'

/**
 * Filter expenses whose `date` (YYYY-MM-DD) starts with the given month
 * key (YYYY-MM). Single source of truth so the dashboard and history page
 * agree exactly on what counts as "this month".
 *
 * Defensive: rows missing or with a non-string date are excluded.
 */
export function filterByMonth(expenses: Expense[], monthStr: string): Expense[] {
  const prefix = monthStr + '-'
  return expenses.filter(e => typeof e.date === 'string' && e.date.startsWith(prefix))
}
