import { memo, useMemo } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import { formatINR } from '@/lib/format'
import { CategoryGlyph, colorForString } from './icons'

type Props = {
  expenses: Expense[]
  /** When true, render payment mode + tag chips on each row (used on /expenses). */
  showTags?: boolean
  /** Row height — sidebar is compact, the full-width History list is comfortable. */
  density?: 'compact' | 'comfortable'
  /**
   * Group consecutive rows under a day header with that day's total. Pass
   * true only when the list is sorted by date — otherwise days interleave.
   */
  groupByDay?: boolean
}

type Group = { date: string; total: number; items: Expense[] }

function dayLabel(date: string, todayStr: string, yesterdayStr: string): string {
  if (date === todayStr) return 'Today'
  if (date === yesterdayStr) return 'Yesterday'
  const d = parseISO(date)
  return isNaN(d.getTime()) ? date : format(d, 'EEE, d MMM')
}

/** "12 Oct" — unambiguous, unlike 10/12. */
function shortDate(date: string): string {
  const d = parseISO(date)
  return isNaN(d.getTime()) ? date : format(d, 'd MMM')
}

/**
 * Shared transaction-row list. Used by:
 * - Dashboard.tsx (sidebar, density=compact, no tags)
 * - HistoryView.tsx (full-width list, density=comfortable, tags shown)
 *
 * Memoised so toggling sibling state (filters, sort dir, etc) on the parent
 * doesn't re-reconcile this list unless the expenses array identity changes.
 */
function TransactionListInner({
  expenses,
  showTags = false,
  density = 'compact',
  groupByDay = false,
}: Props) {
  const groups = useMemo<Group[]>(() => {
    if (!groupByDay) return [{ date: '', total: 0, items: expenses }]
    const out: Group[] = []
    for (const e of expenses) {
      const last = out[out.length - 1]
      if (last && last.date === e.date) {
        last.items.push(e)
        last.total += e.cost
      } else {
        out.push({ date: e.date, total: e.cost, items: [e] })
      }
    }
    return out
  }, [expenses, groupByDay])

  const now = new Date()
  const todayStr     = format(now, 'yyyy-MM-dd')
  const yesterdayStr = format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), 'yyyy-MM-dd')

  const rowH = density === 'comfortable' ? 'min-h-[64px] py-3' : 'min-h-[60px] py-2.5'

  return (
    <div>
      {groups.map(g => (
        <section key={g.date || 'all'} aria-label={g.date ? dayLabel(g.date, todayStr, yesterdayStr) : undefined}>
          {groupByDay && (
            <div className="flex items-baseline justify-between px-4 pt-4 pb-1.5">
              <h3 className="text-xs font-semibold text-muted">{dayLabel(g.date, todayStr, yesterdayStr)}</h3>
              <span className="text-xs text-mutedDim tabular-nums">₹{formatINR(g.total)}</span>
            </div>
          )}
          <ul>
            {g.items.map(e => {
              const color = colorForString(e.expenseType)
              const meta = [e.expenseType, e.app, !groupByDay && shortDate(e.date), showTags && e.paymentMode]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={e.rowIndex}>
                  <Link
                    href={`/expenses/${e.rowIndex}`}
                    className={`flex items-center gap-3 px-4 ${rowH} transition-colors duration-150 hover:bg-surface2 active:bg-surface2`}
                  >
                    <span
                      className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: `${color}1f`, color }}
                      aria-hidden
                    >
                      <CategoryGlyph category={e.expenseType} className="w-[18px] h-[18px]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-medium text-ink truncate">{e.name}</p>
                        {e.oneTime && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted ring-1 ring-inset ring-line-strong rounded px-1.5 py-px shrink-0">
                            One-time
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-mutedDim mt-0.5 truncate">{meta}</p>
                      {showTags && e.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {e.tags.map(t => (
                            <span key={t} className="text-[11px] text-muted bg-surface2 rounded-md px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-semibold text-ink tabular-nums">₹{formatINR(e.cost)}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: colorForString(e.paidBy) }}>{e.paidBy}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

const TransactionList = memo(TransactionListInner)
export default TransactionList
