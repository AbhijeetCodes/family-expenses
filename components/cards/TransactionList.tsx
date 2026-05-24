'use client'

import { memo, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FixedSizeList as List } from 'react-window'
import type { Expense } from '@/lib/expenses'
import { CategoryIcon, AvatarBadge, PencilIcon } from '../icons'

const ROW_HEIGHT = 72
const VIRTUALIZE_THRESHOLD = 30

type Props = {
  expenses: Expense[]
  totalCount: number
  monthLabel: string
  sortKey: 'date' | 'cost' | 'name'
  sortDir: 'desc' | 'asc'
  onSortKeyChange: (k: 'date' | 'cost' | 'name') => void
  onSortDirChange: () => void
  totalActiveFilters: number
}

function Row({ e }: { e: Expense }) {
  return (
    <Link
      href={`/expenses/${e.rowIndex}`}
      className="flex items-center gap-3 px-4 hover:bg-surface2/60 transition-colors group h-full"
    >
      <CategoryIcon category={e.expenseType} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink truncate">{e.name || e.expenseType || 'Untitled'}</p>
          {e.oneTime && (
            <span className="text-[9px] uppercase tracking-wider bg-down/15 text-down border border-down/20 px-1.5 py-0.5 rounded-full shrink-0 font-semibold leading-none">
              one-time
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 truncate">
          {e.expenseType}
          {e.app ? ` · ${e.app}` : ''} · {e.date.slice(5).replace('-', '/')}
          {e.paymentMode ? ` · ${e.paymentMode}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right">
          <p className="text-sm font-semibold text-ink tabular-nums">
            ₹{e.cost.toLocaleString('en-IN')}
          </p>
        </div>
        <AvatarBadge initial={e.paidBy || '?'} size="md" />
      </div>
    </Link>
  )
}

const MemoRow = memo(Row)

function ListInner({
  expenses, totalCount, monthLabel, sortKey, sortDir,
  onSortKeyChange, onSortDirChange, totalActiveFilters,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState(0)

  // Compute height of the scroll area so react-window knows what to virtualize
  useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setListHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filtered = expenses.length !== totalCount

  return (
    <div className="card p-0 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-divider/50 flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-ink">
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
            {filtered && (
              <span className="text-muted font-normal"> of {totalCount}</span>
            )}
          </p>
          <p className="text-[11px] text-mutedDim">{monthLabel}</p>
        </div>
        <button className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface2 transition-colors" aria-label="Sort">
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Sort bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-2 border-b border-divider/50 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-mutedDim">Sort</span>
          <select
            value={sortKey}
            onChange={e => onSortKeyChange(e.target.value as Props['sortKey'])}
            className="bg-surface2 border-0 ring-1 ring-divider rounded-lg text-muted text-xs py-1 px-2 focus:ring-accent"
          >
            <option value="date">Date</option>
            <option value="cost">Amount</option>
            <option value="name">Name</option>
          </select>
          <button
            onClick={onSortDirChange}
            className="text-muted hover:text-ink transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-surface2"
            title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Virtualized list */}
      <div ref={wrapRef} className="flex-1 overflow-hidden">
        {expenses.length === 0 ? (
          <p className="text-center py-12 text-sm text-mutedDim">
            {totalActiveFilters > 0
              ? 'No transactions match the current filters.'
              : `No expenses for ${monthLabel}`}
          </p>
        ) : expenses.length < VIRTUALIZE_THRESHOLD ? (
          // For small lists, skip react-window overhead
          <div className="overflow-y-auto h-full divide-y divide-divider/30">
            {expenses.map(e => (
              <div key={e.rowIndex} style={{ height: ROW_HEIGHT }}>
                <MemoRow e={e} />
              </div>
            ))}
          </div>
        ) : listHeight > 0 ? (
          <List
            height={listHeight}
            itemCount={expenses.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            overscanCount={5}
          >
            {({ index, style }) => (
              <div style={style} className="border-b border-divider/30">
                <MemoRow e={expenses[index]} />
              </div>
            )}
          </List>
        ) : null}
      </div>
    </div>
  )
}

export default memo(ListInner)
