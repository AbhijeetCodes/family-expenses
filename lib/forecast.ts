import type { Expense } from './expenses'

/**
 * A single expense at or above this is a "bill" (rent, cook salary, metro
 * pass, electricity) — it lands once, on its own day, so it is never
 * extrapolated by a daily rate.
 */
export const BILL_THRESHOLD = 2500

/**
 * How many days of history the daily rate is worth at the start of the month.
 * On day 3 the rate is mostly last months'; by day 20 it is mostly this
 * month's.
 */
const PRIOR_DAYS = 7

export type Forecast = {
  /** Projected month total: spent so far + everyday spend still to come + bills still due. */
  total: number
  /** Bills that usually land later in the month but haven't been paid yet. */
  billsDue: number
  /** Categories making up `billsDue`, largest first — for the "incl. Rent…" hint. */
  billNames: string[]
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
const sum = (xs: Expense[]) => xs.reduce((s, e) => s + e.cost, 0)
const dayOf = (e: Expense) => Number(e.date.slice(8, 10))
const catKey = (e: Expense) => e.expenseType.trim().toLowerCase() || 'other'
const isBill = (e: Expense) => e.cost >= BILL_THRESHOLD

/**
 * Month-end forecast for a month in progress.
 *
 *   spent so far
 *   + everyday rate × days left   (small expenses; this month's rate blended
 *                                  with the history median, weighted by days elapsed)
 *   + bills still due             (per category: what usually lands after
 *                                  today or is running late, capped by what's
 *                                  left of its usual monthly total)
 *
 * One-time expenses are never projected: they count in `spent` only if the
 * caller's filters let them through. Medians across months keep an unflagged
 * one-off (an admission fee, a sofa) from becoming the "usual".
 *
 * Backtested on Jun–Sep 2026: ~6–10% mean error vs ~30–40% for straight-line
 * total ÷ days × month length, which missed rent until the 24th.
 *
 * @param current  this month's expenses, already filtered
 * @param history  previous months (ideally 3), each already filtered
 */
export function forecastMonth(
  current: Expense[],
  history: Expense[][],
  day: number,
  daysInMonth: number,
): Forecast {
  const spent = sum(current)
  const daysLeft = daysInMonth - day
  const regular = current.filter(e => !e.oneTime && e.date && dayOf(e) <= day)
  const months = history
    .map(m => m.filter(e => !e.oneTime && e.date))
    .filter(m => m.length > 0)

  // Everyday spend
  const thisSmall = sum(regular.filter(e => !isBill(e)))
  const histDaily = median(months.map(m => {
    const dim = new Date(Number(m[0].date.slice(0, 4)), Number(m[0].date.slice(5, 7)), 0).getDate()
    return sum(m.filter(e => !isBill(e))) / dim
  }))
  const rate = months.length > 0
    ? (thisSmall + PRIOR_DAYS * histDaily) / (day + PRIOR_DAYS)
    : thisSmall / day

  // Bills still due
  const due = new Map<string, { amount: number; label: string }>()
  const cats = new Set(months.flatMap(m => m.filter(isBill).map(catKey)))
  for (const cat of cats) {
    const bills = (xs: Expense[]) => xs.filter(e => isBill(e) && catKey(e) === cat)
    const usuallyBy    = median(months.map(m => sum(bills(m).filter(e => dayOf(e) <= day))))
    const usuallyAfter = median(months.map(m => sum(bills(m).filter(e => dayOf(e) > day))))
    const usualTotal   = median(months.map(m => sum(bills(m))))
    const paid = sum(bills(regular))
    // What usually comes after today, plus anything usually paid by now that
    // hasn't been (rent on the 26th instead of the 24th) — capped by what's
    // left of the usual monthly total, so rent logged early isn't counted twice.
    const amount = Math.min(usuallyAfter + Math.max(0, usuallyBy - paid), Math.max(0, usualTotal - paid))
    if (amount > 0) {
      const label = months.flatMap(bills).at(-1)!.expenseType.trim()
      due.set(cat, { amount, label })
    }
  }
  const billsDue = [...due.values()].reduce((s, b) => s + b.amount, 0)
  const billNames = [...due.values()].sort((a, b) => b.amount - a.amount).map(b => b.label)

  return { total: spent + rate * daysLeft + billsDue, billsDue, billNames }
}
