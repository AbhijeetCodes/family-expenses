'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO, endOfMonth } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import FilterBar, { activeFilterCount } from './FilterBar'
import MonthNav from './MonthNav'
import SortToggle from './SortToggle'
import TransactionList from './TransactionList'
import { SearchIcon, XIcon, ChevronDownIcon, ChevronLeftIcon } from './icons'
import { unique } from '@/lib/utils'
import { formatINR } from '@/lib/format'
import { useFilterParams, useCarriedHref } from '@/lib/useFilterParams'
import { monthStart } from '@/lib/date'

// History shows everything by default — it's the place to find any expense.
const DEFAULT_EXCLUDE_ONE_TIME = false

type Props = {
  monthExpenses: Expense[]
  monthLabel: string
  monthStr: string
}

export default function HistoryView({ monthExpenses, monthLabel, monthStr }: Props) {
  // URL-backed filters: shared schema with Dashboard so toggling on either
  // page persists when you cross between them. HistoryView defaults to
  // *not* hiding one-time expenses (the page is meant to show everything).
  const f = useFilterParams({ excludeOneTime: DEFAULT_EXCLUDE_ONE_TIME, sortKey: 'date', sortDir: 'desc' })
  const carry = useCarriedHref()
  const {
    excludedTypes, excludedApps, excludedModes, excludedPaidBy, excludedTags,
    excludeOneTime, sortKey, sortDir, selectedDate, search,
    setSortKey, toggleSortDir, setSelectedDate, setSearch, clearAll,
  } = f

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

  const filterOptions = useMemo(
    () => ({ types: allTypes, paidBy: allPaidBy, apps: allApps, modes: allModes, tags: allTags }),
    [allTypes, allPaidBy, allApps, allModes, allTags]
  )
  const totalActiveFilters = activeFilterCount(f, DEFAULT_EXCLUDE_ONE_TIME)

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

  const monthDate     = monthStart(monthStr)
  const monthName     = format(monthDate, 'MMMM')
  const monthFirstDay = `${monthStr}-01`
  const monthLastDay  = format(endOfMonth(monthDate), 'yyyy-MM-dd')
  const hasNarrowing  = totalActiveFilters > 0 || !!needle || !!selectedDate

  const summaryLabel = selectedDate
    ? `Spent on ${format(parseISO(selectedDate), 'd MMMM')}`
    : hasNarrowing ? 'Matching total' : `Total for ${monthName}`

  const datePill = (
    <span className={`pill pr-1 relative ${selectedDate ? 'pill-active' : 'pill-default'}`}>
      <span className="tabular-nums">{selectedDate ? format(parseISO(selectedDate), 'd MMM') : 'Any day'}</span>
      {/* Invisible native picker over the pill: one tap opens the OS date sheet. */}
      <input
        type="date"
        value={selectedDate ?? ''}
        min={monthFirstDay}
        max={monthLastDay}
        onChange={e => setSelectedDate(e.target.value || null)}
        onClick={e => { try { e.currentTarget.showPicker() } catch {} }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Show a single day"
      />
      {selectedDate ? (
        <button
          type="button"
          onClick={() => setSelectedDate(null)}
          className="relative w-6 h-6 rounded-full inline-flex items-center justify-center text-muted hover:text-ink hover:bg-ink/10"
          aria-label="Clear date"
        >
          <XIcon className="w-3 h-3" />
        </button>
      ) : (
        <ChevronDownIcon className="w-3 h-3 mr-2" />
      )}
    </span>
  )

  return (
    <div className="min-h-screen pb-nav">
      {/* Month, search and filters stay together as one sticky block. */}
      <div className="bg-base/90 backdrop-blur-md border-b border-line sticky top-0 z-30 pt-safe">
        <div className="relative h-14 flex items-center justify-center max-w-4xl mx-auto px-4">
          <Link href={carry('/', { month: monthStr })} className="icon-btn absolute left-2 hidden lg:inline-flex" aria-label="Back to dashboard">
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>
          <MonthNav basePath="/expenses" monthStr={monthStr} monthLabel={monthLabel} />
        </div>
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedDim pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Search name, type, app, person, tag or amount"
              className="input-field !h-10 !pl-10 !pr-10 [&::-webkit-search-cancel-button]:hidden"
              aria-label="Search expenses"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-surface2 flex items-center justify-center"
                aria-label="Clear search"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <FilterBar
          f={f}
          options={filterOptions}
          defaultExcludeOneTime={DEFAULT_EXCLUDE_ONE_TIME}
          leading={datePill}
          className="max-w-4xl mx-auto px-4 py-2.5"
        />
      </div>

      {/* Summary: the (filtered) total leads; count and sort support it. */}
      <div className="max-w-4xl mx-auto px-4 pt-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="eyebrow">{summaryLabel}</h2>
          <p className="mt-1.5 text-[32px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
            <span className="text-[0.6em] font-medium text-muted align-[0.25em] mr-0.5">₹</span>{formatINR(total)}
          </p>
          <p className="mt-2 text-xs text-mutedDim tabular-nums">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== monthExpenses.length && ` of ${monthExpenses.length}`}
          </p>
        </div>
        <SortToggle sortKey={sortKey} sortDir={sortDir} onChangeSortKey={setSortKey} onToggleSortDir={toggleSortDir} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {sorted.length === 0 ? (
          <div className="card text-center py-14">
            <p className="text-sm text-muted">
              {hasNarrowing ? 'Nothing matches this search or these filters.' : `No expenses in ${monthLabel} yet.`}
            </p>
            {hasNarrowing && (
              <button
                type="button"
                onClick={() => { clearAll(); onQueryChange(''); setSelectedDate(null) }}
                className="mt-2 text-sm font-medium text-accent hover:text-accent-2"
              >
                Clear search and filters
              </button>
            )}
          </div>
        ) : (
          <div className="card p-0 md:p-0 overflow-hidden pb-2">
            <TransactionList expenses={sorted} density="comfortable" showTags groupByDay={sortKey === 'date'} />
          </div>
        )}
      </div>
    </div>
  )
}

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
