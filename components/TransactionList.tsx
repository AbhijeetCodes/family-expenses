import { memo } from 'react'
import Link from 'next/link'
import type { Expense } from '@/lib/expenses'
import { formatINR } from '@/lib/format'

type Props = {
  expenses: Expense[]
  /** When true, render the tag chips beneath each row (used on /expenses). */
  showTags?: boolean
  /** Row vertical padding — sidebar uses 3, full-width list uses 3.5. */
  density?: 'compact' | 'comfortable'
  /** Divider tone — sidebar uses /40, full-width list uses /50. */
  dividerTone?: 'soft' | 'standard'
}

/**
 * Shared transaction-row list. Used by:
 * - Dashboard.tsx (sidebar, density=compact, dividerTone=soft, no tags)
 * - HistoryView.tsx (full-width list, density=comfortable, dividerTone=standard, tags shown)
 *
 * Memoised so toggling sibling state (filters, sort dir, etc) on the parent
 * doesn't re-reconcile this list unless the expenses array identity changes.
 */
function TransactionListInner({
  expenses,
  showTags = false,
  density = 'compact',
  dividerTone = 'soft',
}: Props) {
  const padY     = density === 'comfortable' ? 'py-3.5' : 'py-3'
  const divider  = dividerTone === 'standard' ? 'divide-divider/50' : 'divide-divider/40'
  const badgeSize = showTags ? 'text-[10px] px-2' : 'text-[9px] px-1.5'
  const chevTone  = dividerTone === 'standard' ? 'text-mutedDim/50' : 'text-mutedDim/40'

  return (
    <ul className={`divide-y ${divider}`}>
      {expenses.map(e => (
        <li key={e.rowIndex}>
          <Link
            href={`/expenses/${e.rowIndex}`}
            className={`flex items-center justify-between px-4 ${padY} hover:bg-surface2/40 transition-colors group`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink truncate">{e.name}</p>
                {e.oneTime && (
                  <span className={`${badgeSize} uppercase tracking-wide bg-down/15 text-down border border-down/20 py-0.5 rounded-full shrink-0 font-medium`}>
                    one-time
                  </span>
                )}
              </div>
              <p className="text-xs text-mutedDim mt-0.5 truncate">
                {e.expenseType}
                {e.app ? ` · ${e.app}` : ''} · {e.date.slice(5).replace('-', '/')}
                {showTags && e.paymentMode ? ` · ${e.paymentMode}` : ''}
              </p>
              {showTags && e.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {e.tags.map(t => (
                    <span key={t} className="text-xs bg-surface2 text-muted rounded px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="text-right">
                <p className="font-semibold text-sm text-ink tabular-nums">₹{formatINR(e.cost)}</p>
                <p className="text-xs text-mutedDim">{e.paidBy}</p>
              </div>
              <span className={`${chevTone} group-hover:text-mutedDim transition-colors`}>›</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const TransactionList = memo(TransactionListInner)
export default TransactionList
