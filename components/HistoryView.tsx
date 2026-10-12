'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, subMonths, addMonths, endOfMonth } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import FilterDropdown from './FilterDropdown'
import TransactionList from './TransactionList'
import { unique } from '@/lib/utils'
import { formatINR } from '@/lib/format'
import type { SortKey } from '@/lib/types'
import { useFilterParams } from '@/lib/useFilterParams'

type Props = {
  monthExpenses: Expense[]
  monthLabel: string
  monthStr: string
}

export default function HistoryView({ monthExpenses, monthLabel, monthStr }: Props) {
  // URL-backed filters: shared schema with Dashboard so toggling on either
  // page persists when you cross between them. HistoryView defaults to
  // *not* hiding one-time expenses (the page is meant to show everything).
  const {
    excludedTypes, excludedApps, excludedModes, excludedPaidBy, excludedTags,
    excludeOneTime, sortKey, sortDir, selectedDate, search,
    setExcludedTypes, setExcludedApps, setExcludedModes, setExcludedPaidBy, setExcludedTags,
    setExcludeOneTime, setSortKey, toggleSortDir, setSelectedDate, setSearch, clearAll,
  } = useFilterParams({ excludeOneTime: false, sortKey: 'date', sortDir: 'desc' })

  // Input is local state (instant typing); URL is synced alongside so the
  // search survives reloads / back. Filtering reads the deferred value so a
  // long list never blocks keystrokes.
  const [query, setQuery] = useState(search)
  const deferredQuery = useDeferredValue(query)
  const needle = deferredQuery.trim().toLowerCase()
  const onQueryChange = (next: string) => {
    setQuery(next)
    setSearch(next.trim())
  }

  const allTypes  = useMemo(() => unique(monthExpenses.map(e => e.expenseType)), [monthExpenses])
  const allApps   = useMemo(() => unique(monthExpenses.map(e => e.app)), [monthExpenses])
  const allModes  = useMemo(() => unique(monthExpenses.map(e => e.paymentMode)), [monthExpenses])
  const allPaidBy = useMemo(() => unique(monthExpenses.map(e => e.paidBy)), [monthExpenses])
  const allTags   = useMemo(() => unique(monthExpenses.flatMap(e => e.tags)), [monthExpenses])

  const totalActiveFilters =
    excludedTypes.size + excludedApps.size + excludedModes.size +
    excludedPaidBy.size + excludedTags.size + (excludeOneTime ? 1 : 0)

  // Single-pass filter + total (was filter+reduce — two passes).
  const { filtered, total } = useMemo(() => {
    const out: Expense[] = []
    let sum = 0
    for (const e of monthExpenses) {
      if (selectedDate && e.date !== selectedDate)      continue
      if (needle && !matchesSearch(e, needle))          continue
      if (excludedTypes.has(e.expenseType))             continue
      if (excludedApps.has(e.app))                      continue
      if (excludedModes.has(e.paymentMode))             continue
      if (excludedPaidBy.has(e.paidBy))                 continue
      if (e.tags.some(t => excludedTags.has(t)))        continue
      if (excludeOneTime && e.oneTime)                  continue
      out.push(e)
      sum += e.cost
    }
    return { filtered: out, total: sum }
  }, [monthExpenses, selectedDate, needle, excludedTypes, excludedApps, excludedModes, excludedPaidBy, excludedTags, excludeOneTime])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date')      cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'cost') cmp = a.cost - b.cost
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [filtered, sortKey, sortDir])

  const monthDate    = new Date(`${monthStr}-01`)
  const prevMonthStr = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonthStr = format(addMonths(monthDate, 1), 'yyyy-MM')
  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM')
  const monthFirstDay  = `${monthStr}-01`
  const monthLastDay   = format(endOfMonth(monthDate), 'yyyy-MM-dd')
  const hasNarrowing   = totalActiveFilters > 0 || !!needle || !!selectedDate

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
        <div className="max-w-4xl mx-auto px-4 pt-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedDim pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Search name, type, app, person, tag or amount"
              className="input-field !py-2 !pl-9 !pr-9 [&::-webkit-search-cancel-button]:hidden"
              aria-label="Search expenses"
            />
            {query && (
              <button
                onClick={() => onQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-muted hover:text-ink hover:bg-surface flex items-center justify-center text-xs"
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
          <label className={`pill cursor-pointer ${selectedDate ? 'pill-active' : 'pill-default'}`}>
            <span>Date</span>
            <input
              type="date"
              value={selectedDate ?? ''}
              min={monthFirstDay}
              max={monthLastDay}
              onChange={e => setSelectedDate(e.target.value || null)}
              className="bg-transparent border-0 p-0 text-xs text-inherit focus:ring-0 [color-scheme:dark] w-[7.5rem]"
              aria-label="Filter by date"
            />
          </label>
          <FilterDropdown label="Type"    options={allTypes}  excluded={excludedTypes}  onChange={setExcludedTypes}  />
          <FilterDropdown label="Paid By" options={allPaidBy} excluded={excludedPaidBy} onChange={setExcludedPaidBy} />
          <FilterDropdown label="App"     options={allApps}   excluded={excludedApps}   onChange={setExcludedApps}   />
          <FilterDropdown label="Mode"    options={allModes}  excluded={excludedModes}  onChange={setExcludedModes}  />
          <FilterDropdown label="Tags"    options={allTags}   excluded={excludedTags}   onChange={setExcludedTags}   />

          <div className="w-px h-4 bg-divider mx-0.5" />

          <button
            onClick={() => setExcludeOneTime(!excludeOneTime)}
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
            ₹{formatINR(total)}
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
          <div className="flex items-center bg-surface2 rounded-lg p-0.5 border border-divider">
            {SORT_OPTIONS.map(({ key, label }) => {
              const active = sortKey === key
              return (
                <button
                  key={key}
                  // Tapping the active option flips direction; tapping another switches key.
                  onClick={() => (active ? toggleSortDir() : setSortKey(key))}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1
                    ${active ? 'bg-surface text-ink font-medium' : 'text-muted hover:text-ink'}`}
                  title={active ? `${label}, ${sortDir === 'desc' ? 'descending' : 'ascending'} — tap to flip` : `Sort by ${label.toLowerCase()}`}
                >
                  {label}
                  {active && <span className="text-accent">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        {sorted.length === 0 ? (
          <div className="card text-center py-12 text-mutedDim text-sm">
            {hasNarrowing ? 'No transactions match the current search or filters.' : `No expenses for ${monthLabel}`}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <TransactionList expenses={sorted} density="comfortable" dividerTone="standard" showTags />
          </div>
        )}
      </div>
    </div>
  )
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'cost', label: 'Amount' },
  { key: 'name', label: 'Name' },
]

/** Case-insensitive match across every text field, plus the amount (so "1200" finds ₹1,200). */
function matchesSearch(e: Expense, needle: string): boolean {
  if (
    e.name.toLowerCase().includes(needle) ||
    e.expenseType.toLowerCase().includes(needle) ||
    e.app.toLowerCase().includes(needle) ||
    e.paymentMode.toLowerCase().includes(needle) ||
    e.paidBy.toLowerCase().includes(needle) ||
    e.tags.some(t => t.toLowerCase().includes(needle))
  ) return true
  const digits = needle.replace(/[₹,\s]/g, '')
  return /^\d+(\.\d+)?$/.test(digits) && String(e.cost).includes(digits)
}
