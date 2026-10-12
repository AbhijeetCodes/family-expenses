'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO, subMonths, getDaysInMonth } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import OverviewCard from './cards/OverviewCard'
import CategoryCard from './cards/CategoryCard'
import DailyTrendCard from './cards/DailyTrendCard'
import FilterBar, { activeFilterCount } from './FilterBar'
import MonthNav from './MonthNav'
import SortToggle from './SortToggle'
import TransactionList from './TransactionList'
import { WalletIcon, PlusIcon, XIcon, CogIcon } from './icons'
import { unique } from '@/lib/utils'
import type { SortKey, SortDir } from '@/lib/types'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useFilterParams } from '@/lib/useFilterParams'

type Props = {
  thisMonthExpenses: Expense[]
  prevMonthExpenses: Expense[]
  monthLabel: string
  monthStr: string
  userName: string
}

/**
 * Header of the desktop transactions sidebar — count, selected-day chip, and
 * sort controls. Pulled out so toggling filters that change `sortedCount` or
 * `selectedDate` doesn't reconcile the (memoised) TransactionList below.
 */
type SidebarHeaderProps = {
  sortedCount: number
  totalCount: number
  selectedDate: string | null
  sortKey: SortKey
  sortDir: SortDir
  onClearSelectedDate: () => void
  onChangeSortKey: (key: SortKey) => void
  onToggleSortDir: () => void
}
const SidebarHeader = memo(function SidebarHeader({
  sortedCount, totalCount, selectedDate, sortKey, sortDir,
  onClearSelectedDate, onChangeSortKey, onToggleSortDir,
}: SidebarHeaderProps) {
  return (
    <div className="px-4 min-h-14 py-2.5 border-b border-line flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-ink">Transactions</h2>
        <span className="text-xs text-mutedDim tabular-nums whitespace-nowrap">
          {sortedCount}{sortedCount !== totalCount && ` of ${totalCount}`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {selectedDate && (
          <button
            type="button"
            onClick={onClearSelectedDate}
            className="pill pill-active !h-7 !px-2.5"
            aria-label={`Showing ${format(parseISO(selectedDate), 'd MMM')} only — clear`}
          >
            {format(parseISO(selectedDate), 'd MMM')}
            <XIcon className="w-3 h-3 -mr-0.5" />
          </button>
        )}
        <SortToggle sortKey={sortKey} sortDir={sortDir} onChangeSortKey={onChangeSortKey} onToggleSortDir={onToggleSortDir} />
      </div>
    </div>
  )
})

export default function Dashboard({
  thisMonthExpenses,
  prevMonthExpenses,
  monthLabel,
  monthStr,
  userName,
}: Props) {
  const router = useRouter()
  // All filter + sort + selectedDate state is URL-backed so it persists across
  // /expenses ↔ / navigation and produces shareable links. Dashboard defaults
  // to excludeOneTime=true (per CLAUDE.md — keeps rare big buys out of totals).
  const f = useFilterParams({ excludeOneTime: DEFAULT_EXCLUDE_ONE_TIME, sortKey: 'date', sortDir: 'desc' })
  const {
    excludedTypes, excludedApps, excludedModes, excludedPaidBy, excludedTags,
    excludeOneTime, sortKey, sortDir, selectedDate,
    setSortKey, toggleSortDir, setSelectedDate,
  } = f

  const [showComparison, setShowComparison] = useState(false)

  const allTypes   = useMemo(() => unique(thisMonthExpenses.map(e => e.expenseType)), [thisMonthExpenses])
  const allApps    = useMemo(() => unique(thisMonthExpenses.map(e => e.app)),         [thisMonthExpenses])
  const allModes   = useMemo(() => unique(thisMonthExpenses.map(e => e.paymentMode)), [thisMonthExpenses])
  const allPaidBy  = useMemo(() => unique(thisMonthExpenses.map(e => e.paidBy)),      [thisMonthExpenses])
  const allTags    = useMemo(() => unique(thisMonthExpenses.flatMap(e => e.tags)),    [thisMonthExpenses])

  const filterOptions = useMemo(
    () => ({ types: allTypes, paidBy: allPaidBy, apps: allApps, modes: allModes, tags: allTags }),
    [allTypes, allPaidBy, allApps, allModes, allTags]
  )
  const totalActiveFilters = activeFilterCount(f, DEFAULT_EXCLUDE_ONE_TIME)

  const applyFilters = useCallback((expenses: Expense[]) =>
    expenses.filter(e => {
      if (excludedTypes.has(e.expenseType))                 return false
      if (excludedApps.has(e.app))                          return false
      if (excludedModes.has(e.paymentMode))                 return false
      if (excludedPaidBy.has(e.paidBy))                     return false
      if (e.tags.some(t => excludedTags.has(t)))            return false
      if (excludeOneTime && e.oneTime)                      return false
      return true
    }),
    [excludedTypes, excludedApps, excludedModes, excludedPaidBy, excludedTags, excludeOneTime]
  )

  const filtered     = useMemo(() => applyFilters(thisMonthExpenses), [applyFilters, thisMonthExpenses])
  const filteredPrev = useMemo(() => applyFilters(prevMonthExpenses), [applyFilters, prevMonthExpenses])

  // Single-pass aggregate of `filtered`: totals, by-category, by-day, by-person.
  // Replaces 4 separate useMemo loops to cut hot-path work on filter toggles.
  const currentAgg = useMemo(() => {
    const cats: Record<string, number> = {}
    const days: Record<string, number> = {}
    const people: Record<string, number> = {}
    let total = 0
    for (const e of filtered) {
      total += e.cost
      const cat = e.expenseType || 'Other'
      cats[cat] = (cats[cat] ?? 0) + e.cost
      if (e.date) days[e.date] = (days[e.date] ?? 0) + e.cost
      const who = e.paidBy || '?'
      people[who] = (people[who] ?? 0) + e.cost
    }
    return { total, cats, days, people }
  }, [filtered])

  const monthDate      = new Date(`${monthStr}-01`)
  const today          = new Date()
  const isCurrentMonth = monthStr === format(today, 'yyyy-MM')
  const daysElapsed    = today.getDate()
  const daysInMonth    = getDaysInMonth(monthDate)

  // Parallel one-pass over prev-month for total + category comparison, plus
  // the total up to today's day-of-month (fair comparison for a month in
  // progress).
  const prevAgg = useMemo(() => {
    const cats: Record<string, number> = {}
    let total = 0
    let toDate = 0
    for (const e of filteredPrev) {
      total += e.cost
      if (Number(e.date.slice(8, 10)) <= daysElapsed) toDate += e.cost
      const cat = e.expenseType || 'Other'
      cats[cat] = (cats[cat] ?? 0) + e.cost
    }
    return { total, toDate, cats }
  }, [filteredPrev, daysElapsed])

  const total     = currentAgg.total
  const prevTotal = prevAgg.total

  const categoryData = useMemo(() => {
    const names = new Set([...Object.keys(currentAgg.cats), ...Object.keys(prevAgg.cats)])
    return [...names]
      .map(n => ({ name: n, current: currentAgg.cats[n] ?? 0, prev: prevAgg.cats[n] ?? 0 }))
      .sort((a, b) => b.current - a.current)
  }, [currentAgg, prevAgg])

  // Every day of the month, zero-filled — gaps are information too.
  const trendData = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => {
      const day = `${monthStr}-${String(i + 1).padStart(2, '0')}`
      return { day, amount: currentAgg.days[day] ?? 0 }
    }),
    [currentAgg, monthStr, daysInMonth]
  )
  const dailyAverage = total / (isCurrentMonth ? daysElapsed : daysInMonth)

  const paidByData = useMemo(
    () => Object.entries(currentAgg.people)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    [currentAgg]
  )

  const sidebarFiltered = useMemo(
    () => selectedDate ? filtered.filter(e => e.date === selectedDate) : filtered,
    [filtered, selectedDate]
  )

  const sortedExpenses = useMemo(() => {
    return [...sidebarFiltered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date')      cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'cost') cmp = a.cost - b.cost
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [sidebarFiltered, sortKey, sortDir])

  const monthName     = format(monthDate, 'MMMM')
  const prevMonthName = format(subMonths(monthDate, 1), 'MMMM')

  // Linear forecast: only meaningful for the current month
  const forecast = useMemo(
    () => (isCurrentMonth && daysElapsed > 0 ? (total / daysElapsed) * daysInMonth : null),
    [isCurrentMonth, total, daysElapsed, daysInMonth]
  )

  const toggleComparison    = useCallback(() => setShowComparison(s => !s), [])
  const clearSelectedDate   = useCallback(() => setSelectedDate(null), [setSelectedDate])

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const handleSelectDay = useCallback((day: string) => {
    if (isDesktop) {
      setSelectedDate(selectedDate === day ? null : day)
    } else {
      router.push(`/expenses?month=${monthStr}&date=${day}`)
    }
  }, [router, monthStr, isDesktop, selectedDate, setSelectedDate])

  return (
    <div className="min-h-screen bg-base pb-nav">
      <header className="bg-base/90 backdrop-blur-md border-b border-line sticky top-0 z-30 pt-safe">
        <div className="relative max-w-[1400px] mx-auto px-4 h-14 flex items-center">
          <span className="hidden sm:flex items-center gap-2 text-[15px] font-semibold text-ink">
            <WalletIcon className="w-5 h-5 text-accent" />
            Expenses
          </span>
          <div className="absolute left-1/2 -translate-x-1/2">
            <MonthNav basePath="/" monthStr={monthStr} monthLabel={monthLabel} />
          </div>
          {/* Desktop has no BottomNav — these are the way to History / Settings. */}
          <div className="ml-auto hidden lg:flex items-center gap-1">
            <Link href={`/expenses?month=${monthStr}`} className="h-9 px-3 rounded-xl inline-flex items-center text-sm font-medium text-muted hover:text-ink hover:bg-surface2 transition-colors">
              History
            </Link>
            <Link href="/settings" className="icon-btn" aria-label="Settings" title={userName ? `Settings · signed in as ${userName}` : 'Settings'}>
              <CogIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/add"
              className="ml-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-accent text-base text-sm font-semibold
                         transition-[background-color,transform] duration-150 ease-crisp hover:bg-accent-2 active:scale-[0.97]"
            >
              <PlusIcon className="w-4 h-4" /> Add expense
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-line">
        <FilterBar
          f={f}
          options={filterOptions}
          defaultExcludeOneTime={DEFAULT_EXCLUDE_ONE_TIME}
          className="max-w-[1400px] mx-auto px-4 py-2.5"
        />
      </div>

      {/* Analytics on the left; on lg+ the transactions sidebar on the right. */}
      <main className="max-w-[1400px] mx-auto px-4 py-4 lg:py-6">
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          <div className="grid gap-4 md:grid-cols-2 min-w-0">
            <div className="md:col-span-2">
              <OverviewCard
                total={total}
                prevTotal={prevTotal}
                compareTotal={isCurrentMonth ? prevAgg.toDate : prevTotal}
                monthName={monthName}
                prevMonthName={prevMonthName}
                forecast={forecast}
                daysElapsed={daysElapsed}
                daysInMonth={daysInMonth}
                paidBy={paidByData}
              />
            </div>
            <CategoryCard
              data={categoryData}
              prevMonthName={prevMonthName}
              showComparison={showComparison}
              onToggleComparison={toggleComparison}
            />
            <DailyTrendCard
              data={trendData}
              average={dailyAverage}
              selectedDate={isDesktop ? selectedDate : null}
              onSelectDay={handleSelectDay}
            />
          </div>

          {/* Right (desktop only): transactions sidebar */}
          <aside className="hidden lg:flex card p-0 md:p-0 overflow-hidden flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)]">
            <SidebarHeader
              sortedCount={sortedExpenses.length}
              totalCount={thisMonthExpenses.length}
              selectedDate={selectedDate}
              sortKey={sortKey}
              sortDir={sortDir}
              onClearSelectedDate={clearSelectedDate}
              onChangeSortKey={setSortKey}
              onToggleSortDir={toggleSortDir}
            />

            <div className="overflow-y-auto overscroll-contain flex-1 pb-2">
              {sortedExpenses.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm text-muted">
                    {totalActiveFilters > 0 || selectedDate ? 'Nothing matches these filters.' : `No expenses in ${monthName} yet.`}
                  </p>
                  {totalActiveFilters > 0 && (
                    <button type="button" onClick={f.clearAll} className="mt-2 text-sm font-medium text-accent hover:text-accent-2">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <TransactionList expenses={sortedExpenses} density="compact" groupByDay={sortKey === 'date'} />
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

const DEFAULT_EXCLUDE_ONE_TIME = true
