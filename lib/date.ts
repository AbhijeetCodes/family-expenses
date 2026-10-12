import { format, parseISO, subDays } from 'date-fns'
import type { Expense } from './expenses'

/**
 * The family's time zone. "Today" and "this month" are computed here rather
 * than from the runtime's clock: the server runs in UTC, so between 00:00 and
 * 05:30 IST it would think it's still yesterday (wrong default month on the
 * 1st, and server/client hydration mismatches on "Today" / "Day N").
 */
export const APP_TIME_ZONE = 'Asia/Kolkata'

const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Today as YYYY-MM-DD in APP_TIME_ZONE. */
export function todayISO(now: Date = new Date()): string {
  return ymd.format(now)
}

/** Yesterday as YYYY-MM-DD in APP_TIME_ZONE. */
export function yesterdayISO(now: Date = new Date()): string {
  return format(subDays(parseISO(todayISO(now)), 1), 'yyyy-MM-dd')
}

/** Current month as YYYY-MM in APP_TIME_ZONE. */
export function currentMonthStr(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7)
}

/** `?month=` if it's a real YYYY-MM, else the current month (bad input used to 500). */
export function resolveMonth(month: string | undefined): string {
  return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : currentMonthStr()
}

/**
 * First day of a YYYY-MM month as a *local* Date. `new Date('2026-05-01')`
 * parses as UTC midnight, which is still April anywhere west of Greenwich.
 */
export function monthStart(monthStr: string): Date {
  return parseISO(`${monthStr}-01`)
}

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
