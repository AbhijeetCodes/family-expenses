'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format, subMonths, addMonths } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import FilterDropdown from './FilterDropdown'

type SortKey = 'date' | 'cost' | 'name'
type SortDir = 'desc' | 'asc'

function unique(arr: string[]) {
  return [...new Set(arr.filter(Boolean))].sort()
}

type Props = {
  monthExpenses: Expense[]
  monthLabel: string
  monthStr: string
}

export default function HistoryView({ monthExpenses, monthLabel, monthStr }: Props) {
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<string | null>(searchParams.get('date'))

  // Filter state — same shape as Dashboard, INDEPENDENT from it
  const [excludedTypes, setExcludedTypes]   = useState<Set<string>>(new Set())
  const [excludedApps, setExcludedApps]     = useState<Set<string>>(new Set())
  const [excludedModes, setExcludedModes]   = useState<Set<string>>(new Set())
  const [excludedPaidBy, setExcludedPaidBy] = useState<Set<string>>(new Set())
  const [excludedTags, setExcludedTags]     = useState<Set<string>>(new Set())
  const [excludeOneTime, setExcludeOneTime] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const allTypes  = useMemo(() => unique(monthExpenses.map(e => e.expenseType)), [monthExpenses])
  const allApps   = useMemo(() => unique(monthExpenses.map(e => e.app)), [monthExpenses])
  const allModes  = useMemo(() => unique(monthExpenses.map(e => e.paymentMode)), [monthExpenses])
  const allPaidBy = useMemo(() => unique(monthExpenses.map(e => e.paidBy)), [monthExpenses])
  const allTags   = useMemo(() => unique(monthExpenses.flatMap(e => e.tags)), [monthExpenses])

  const totalActiveFilters =
    excludedTypes.size + excludedApps.size + excludedModes.size +
    excludedPaidBy.size + excludedTags.size + (excludeOneTime ? 1 : 0)

  const filtered = useMemo(() => monthExpenses.filter(e => {
    if (selectedDate && e.date !== selectedDate)      return false
    if (excludedTypes.has(e.expenseType))             return false
    if (excludedApps.has(e.app))                      return false
    if (excludedModes.has(e.paymentMode))             return false
    if (excludedPaidBy.has(e.paidBy))                 return false
    if (e.tags.some(t => excludedTags.has(t)))        return false
    if (excludeOneTime && e.oneTime)                  return false
    return true
  }), [monthExpenses, selectedDate, excludedTypes, excludedApps, excludedModes, excludedPaidBy, excludedTags, excludeOneTime])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date')      cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'cost') cmp = a.cost - b.cost
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [filtered, sortKey, sortDir])

  const total = filtered.reduce((s, e) => s + e.cost, 0)

  const monthDate    = new Date(`${monthStr}-01`)
  const prevMonthStr = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonthStr = format(addMonths(monthDate, 1), 'yyyy-MM')
  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM')

  const clearAll = useCallback(() => {
    setExcludedTypes(new Set()); setExcludedApps(new Set()); setExcludedModes(new Set())
    setExcludedPaidBy(new Set()); setExcludedTags(new Set()); setExcludeOneTime(false)
  }, [])

  const toggleSortDir = useCallback(() => setSortDir(d => d === 'desc' ? 'asc' : 'desc'), [])

  return (
    <div className="min-h-screen pb-24">
      {/* Month nav */}
      <header className="bg-surface border-b border-divider px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href={`/expenses?month=${prevMonthStr}`} className="text-muted hover:text-ink w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-surface2 transition-colors">‹</Link>
          <h1 className="font-bold text-ink">{monthLabel}</h1>
          <Link
            href={`/expenses?month=${nextMonthStr}`}
            className={`w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-colors
              ${isCurrentMonth ? 'text-mutedDim/30 pointer-events-none' : 'text-muted hover:text-ink hover:bg-surface2'}`}
          >›</Link>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-surface/60 border-b border-divider/50 sticky top-[57px] z-20 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
          <FilterDropdown label="Type"    options={allTypes}  excluded={excludedTypes}  onChange={setExcludedTypes}  />
          <FilterDropdown label="Paid By" options={allPaidBy} excluded={excludedPaidBy} onChange={setExcludedPaidBy} />
          <FilterDropdown label="App"     options={allApps}   excluded={excludedApps}   onChange={setExcludedApps}   />
          <FilterDropdown label="Mode"    options={allModes}  excluded={excludedModes}  onChange={setExcludedModes}  />
          <FilterDropdown label="Tags"    options={allTags}   excluded={excludedTags}   onChange={setExcludedTags}   />

          <div className="w-px h-4 bg-divider mx-0.5" />

          <button
            onClick={() => setExcludeOneTime(v => !v)}
            className={`pill ${excludeOneTime ? '!bg-down/15 !text-down !border-down/30' : 'pill-default'}`}
          >
            {excludeOneTime ? '✕ one-time excluded' : 'Exclude one-time'}
          </button>

          {totalActiveFilters > 0 && (
            <>
              <div className="w-px h-4 bg-divider mx-0.5" />
              <button onClick={clearAll} className="text-xs text-muted hover:text-ink transition-colors underline underline-offset-2">
                Clear all ({totalActiveFilters})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary + sort */}
      <div className="max-w-4xl mx-auto px-4 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== monthExpenses.length && (
              <span className="text-mutedDim"> of {monthExpenses.length}</span>
            )}
          </span>
          <span className="font-bold text-accent text-base tabular-nums">
            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="pill pill-active !text-xs !py-0.5 !px-2 flex items-center gap-1"
            >
              Day {selectedDate.slice(8)} <span className="opacity-70">✕</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-mutedDim">Sort</span>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-surface2 border border-divider rounded-md text-ink text-xs py-1 px-2 focus:ring-accent focus:border-accent"
          >
            <option value="date">Date</option>
            <option value="cost">Amount</option>
            <option value="name">Name</option>
          </select>
          <button
            onClick={toggleSortDir}
            className="text-muted hover:text-ink w-6 h-6 rounded hover:bg-surface2 flex items-center justify-center"
            title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        {sorted.length === 0 ? (
          <div className="card text-center py-12 text-mutedDim text-sm">
            {totalActiveFilters > 0 ? 'No transactions match the current filters.' : `No expenses for ${monthLabel}`}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <ul className="divide-y divide-divider/50">
              {sorted.map(e => (
                <li key={e.rowIndex}>
                  <Link
                    href={`/expenses/${e.rowIndex}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-surface2/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink truncate">{e.name}</p>
                        {e.oneTime && (
                          <span className="text-[10px] uppercase tracking-wide bg-down/15 text-down border border-down/20 px-2 py-0.5 rounded-full shrink-0 font-medium">
                            one-time
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-mutedDim mt-0.5">
                        {e.expenseType}
                        {e.app ? ` · ${e.app}` : ''} · {e.date.slice(5).replace('-', '/')}
                        {e.paymentMode ? ` · ${e.paymentMode}` : ''}
                      </p>
                      {e.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {e.tags.map(t => (
                            <span key={t} className="text-xs bg-surface2 text-muted rounded px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm text-ink tabular-nums">₹{e.cost.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-mutedDim">{e.paidBy}</p>
                      </div>
                      <span className="text-mutedDim/50 group-hover:text-mutedDim transition-colors">›</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
