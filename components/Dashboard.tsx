'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, subMonths, addMonths } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import OverviewCard from './cards/OverviewCard'
import PaidByCard from './cards/PaidByCard'
import CategoryCard from './cards/CategoryCard'
import DailyTrendCard from './cards/DailyTrendCard'
import FilterDropdown from './FilterDropdown'
import TransactionList from './TransactionList'
import { WalletIcon, PlusIcon } from './icons'

type Props = {
  thisMonthExpenses: Expense[]
  prevMonthExpenses: Expense[]
  monthLabel: string
  monthStr: string
  userName: string
}

function unique(arr: string[]) {
  return [...new Set(arr.filter(Boolean))].sort()
}

export default function Dashboard({
  thisMonthExpenses,
  prevMonthExpenses,
  monthLabel,
  monthStr,
  userName,
}: Props) {
  const router = useRouter()
  const [excludedTypes,   setExcludedTypes]   = useState<Set<string>>(new Set())
  const [excludedApps,    setExcludedApps]    = useState<Set<string>>(new Set())
  const [excludedModes,   setExcludedModes]   = useState<Set<string>>(new Set())
  const [excludedPaidBy,  setExcludedPaidBy]  = useState<Set<string>>(new Set())
  const [excludedTags,    setExcludedTags]    = useState<Set<string>>(new Set())
  const [excludeOneTime,  setExcludeOneTime]  = useState(true)

  // Desktop-only transactions sidebar
  const [sortKey, setSortKey] = useState<'date' | 'cost' | 'name'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [showComparison, setShowComparison] = useState(false)

  const allTypes   = useMemo(() => unique(thisMonthExpenses.map(e => e.expenseType)), [thisMonthExpenses])
  const allApps    = useMemo(() => unique(thisMonthExpenses.map(e => e.app)),         [thisMonthExpenses])
  const allModes   = useMemo(() => unique(thisMonthExpenses.map(e => e.paymentMode)), [thisMonthExpenses])
  const allPaidBy  = useMemo(() => unique(thisMonthExpenses.map(e => e.paidBy)),      [thisMonthExpenses])
  const allTags    = useMemo(() => unique(thisMonthExpenses.flatMap(e => e.tags)),    [thisMonthExpenses])

  const totalActiveFilters =
    excludedTypes.size + excludedApps.size + excludedModes.size + excludedPaidBy.size + excludedTags.size + (excludeOneTime ? 1 : 0)

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

  // Parallel one-pass over prev-month for total + category comparison.
  const prevAgg = useMemo(() => {
    const cats: Record<string, number> = {}
    let total = 0
    for (const e of filteredPrev) {
      total += e.cost
      const cat = e.expenseType || 'Other'
      cats[cat] = (cats[cat] ?? 0) + e.cost
    }
    return { total, cats }
  }, [filteredPrev])

  const total     = currentAgg.total
  const prevTotal = prevAgg.total

  const categoryData = useMemo(() => {
    const names = new Set([...Object.keys(currentAgg.cats), ...Object.keys(prevAgg.cats)])
    return [...names]
      .map(n => ({ name: n, current: currentAgg.cats[n] ?? 0, prev: prevAgg.cats[n] ?? 0 }))
      .sort((a, b) => b.current - a.current)
  }, [currentAgg, prevAgg])

  const trendData = useMemo(
    () => Object.entries(currentAgg.days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({ day, amount })),
    [currentAgg]
  )

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

  const monthDate      = new Date(`${monthStr}-01`)
  const prevMonthStr   = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonthStr   = format(addMonths(monthDate, 1), 'yyyy-MM')
  const today          = new Date()
  const isCurrentMonth = monthStr === format(today, 'yyyy-MM')

  // Linear forecast: only meaningful for the current month
  const daysElapsed = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const forecast = useMemo(
    () => (isCurrentMonth && daysElapsed > 0 ? (total / daysElapsed) * daysInMonth : null),
    [isCurrentMonth, total, daysElapsed, daysInMonth]
  )

  const toggleComparison = useCallback(() => setShowComparison(s => !s), [])
  const toggleSortDir    = useCallback(() => setSortDir(d => d === 'desc' ? 'asc' : 'desc'), [])

  const clearAllFilters = useCallback(() => {
    setExcludedTypes(new Set()); setExcludedApps(new Set()); setExcludedModes(new Set())
    setExcludedPaidBy(new Set()); setExcludedTags(new Set()); setExcludeOneTime(false)
  }, [])

  const handleSelectDay = useCallback((day: string) => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setSelectedDate(prev => prev === day ? null : day)
    } else {
      router.push(`/expenses?month=${monthStr}&date=${day}`)
    }
  }, [router, monthStr])

  return (
    <div className="min-h-screen bg-base pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-surface border-b border-divider sticky top-0 z-30">
        <div className="relative max-w-[1400px] mx-auto px-4 h-14 flex items-center">
          <span className="font-bold text-ink flex items-center gap-2 z-10">
            <WalletIcon className="w-5 h-5 text-accent" />
            Expenses
          </span>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            <Link href={`/?month=${prevMonthStr}`} className="text-muted hover:text-ink w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 transition-colors text-lg">‹</Link>
            <span className="text-ink font-medium text-sm px-2 min-w-[110px] text-center">{monthLabel}</span>
            <Link href={`/?month=${nextMonthStr}`} className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${isCurrentMonth ? 'text-mutedDim/40 pointer-events-none' : 'text-muted hover:text-ink hover:bg-surface2'}`}>›</Link>
          </div>
          <div className="ml-auto hidden md:flex items-center gap-3 z-10">
            <Link href="/add" className="flex items-center gap-1.5 bg-accent hover:bg-accent-2 text-base font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
              <PlusIcon className="w-4 h-4" /> Add Expense
            </Link>
            <span className="text-sm text-muted">{userName}</span>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-surface/60 border-b border-divider/50">
        <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
          <FilterDropdown label="Type"    options={allTypes}  excluded={excludedTypes}  onChange={setExcludedTypes} />
          <FilterDropdown label="Paid By" options={allPaidBy} excluded={excludedPaidBy} onChange={setExcludedPaidBy} />
          <FilterDropdown label="App"     options={allApps}   excluded={excludedApps}   onChange={setExcludedApps} />
          <FilterDropdown label="Mode"    options={allModes}  excluded={excludedModes}  onChange={setExcludedModes} />
          <FilterDropdown label="Tags"    options={allTags}   excluded={excludedTags}   onChange={setExcludedTags} />
          <button
            onClick={() => setExcludeOneTime(!excludeOneTime)}
            className={`pill ${excludeOneTime ? 'pill-active !bg-down/15 !text-down !border-down/30' : 'pill-default'}`}
          >
            {excludeOneTime ? '✕ one-time excluded' : 'Exclude one-time'}
          </button>
          {totalActiveFilters > 0 && (
            <button onClick={clearAllFilters} className="text-xs text-muted hover:text-ink transition-colors underline underline-offset-2 ml-auto">
              Clear all ({totalActiveFilters})
            </button>
          )}
        </div>
      </div>

      {/* Main layout: analytics-only on mobile, analytics + transactions sidebar on lg+ */}
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] lg:items-start">
          {/* Left: analytics 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OverviewCard
              total={total}
              prevTotal={prevTotal}
              monthLabel={monthLabel}
              forecast={forecast}
              daysElapsed={daysElapsed}
              daysInMonth={daysInMonth}
            />
            <PaidByCard data={paidByData} />
            <CategoryCard data={categoryData} showComparison={showComparison} onToggleComparison={toggleComparison} />
            <DailyTrendCard data={trendData} onSelectDay={handleSelectDay} />
          </div>

          {/* Right (desktop only): transactions sidebar */}
          <aside className="hidden lg:flex card p-0 overflow-hidden flex-col lg:sticky lg:top-[7.5rem] lg:max-h-[calc(100vh-8.5rem)]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-divider/60 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <p className="text-sm font-semibold text-ink truncate">
                  {sortedExpenses.length}
                  {sortedExpenses.length !== thisMonthExpenses.length && (
                    <span className="text-mutedDim font-normal"> of {thisMonthExpenses.length}</span>
                  )}
                  <span className="text-muted font-normal"> transactions</span>
                </p>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="pill pill-active !text-xs !py-0.5 !px-2 flex items-center gap-1 shrink-0"
                  >
                    Day {selectedDate.slice(8)} <span className="opacity-70">✕</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs shrink-0">
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as typeof sortKey)}
                  className="bg-surface2 border border-divider rounded-md text-ink text-xs py-1 px-1.5 focus:ring-accent focus:border-accent"
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
            <div className="overflow-y-auto flex-1">
              {sortedExpenses.length === 0 ? (
                <p className="text-center py-12 text-mutedDim text-sm">
                  {totalActiveFilters > 0 ? 'No transactions match the current filters.' : 'No expenses this month'}
                </p>
              ) : (
                <TransactionList expenses={sortedExpenses} density="compact" dividerTone="soft" />
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile FAB */}
      <Link
        href="/add"
        className="fixed bottom-20 right-4 lg:hidden w-14 h-14 bg-accent hover:bg-accent-2 text-base rounded-full
                   flex items-center justify-center shadow-lg z-30"
        aria-label="Add expense"
      >
        <PlusIcon className="w-6 h-6" />
      </Link>
    </div>
  )
}
