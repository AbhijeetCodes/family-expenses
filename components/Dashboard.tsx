'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { format, subMonths, addMonths } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import OverviewCard from './cards/OverviewCard'
import PaidByCard from './cards/PaidByCard'
import CategoryCard from './cards/CategoryCard'
import DailyTrendCard from './cards/DailyTrendCard'
import TransactionList from './cards/TransactionList'
import SignOutButton from './SignOutButton'
import FilterDropdown from './FilterDropdown'
import { WalletIcon, PlusIcon } from './icons'

type Props = {
  thisMonthExpenses: Expense[]
  prevMonthExpenses: Expense[]
  monthLabel: string
  monthStr: string
  userName: string
}

type SortKey = 'date' | 'cost' | 'name'
type SortDir = 'desc' | 'asc'

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
  const [excludedTypes,   setExcludedTypes]   = useState<Set<string>>(new Set())
  const [excludedApps,    setExcludedApps]    = useState<Set<string>>(new Set())
  const [excludedModes,   setExcludedModes]   = useState<Set<string>>(new Set())
  const [excludedPaidBy,  setExcludedPaidBy]  = useState<Set<string>>(new Set())
  const [excludedTags,    setExcludedTags]    = useState<Set<string>>(new Set())
  const [excludeOneTime,  setExcludeOneTime]  = useState(false)

  const [showComparison, setShowComparison] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  const total     = useMemo(() => filtered.reduce((s, e) => s + e.cost, 0), [filtered])
  const prevTotal = useMemo(() => filteredPrev.reduce((s, e) => s + e.cost, 0), [filteredPrev])

  const categoryData = useMemo(() => {
    const curr: Record<string, number> = {}
    const prev: Record<string, number> = {}
    for (const e of filtered)     curr[e.expenseType || 'Other'] = (curr[e.expenseType || 'Other'] ?? 0) + e.cost
    for (const e of filteredPrev) prev[e.expenseType || 'Other'] = (prev[e.expenseType || 'Other'] ?? 0) + e.cost
    const names = new Set([...Object.keys(curr), ...Object.keys(prev)])
    return [...names].map(n => ({ name: n, current: curr[n] ?? 0, prev: prev[n] ?? 0 }))
      .sort((a, b) => b.current - a.current)
  }, [filtered, filteredPrev])

  const trendData = useMemo(() => {
    const byDay: Record<string, number> = {}
    for (const e of filtered) if (e.date) byDay[e.date] = (byDay[e.date] ?? 0) + e.cost
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({ day, amount }))
  }, [filtered])

  const paidByData = useMemo(() => {
    const byPerson: Record<string, number> = {}
    for (const e of filtered) byPerson[e.paidBy || '?'] = (byPerson[e.paidBy || '?'] ?? 0) + e.cost
    return Object.entries(byPerson).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const sortedExpenses = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'cost') cmp = a.cost - b.cost
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [filtered, sortKey, sortDir])

  const monthDate      = new Date(`${monthStr}-01`)
  const prevMonthStr   = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonthStr   = format(addMonths(monthDate, 1), 'yyyy-MM')
  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM')

  const toggleSortDir = useCallback(() => setSortDir(d => d === 'desc' ? 'asc' : 'desc'), [])
  const toggleComparison = useCallback(() => setShowComparison(s => !s), [])

  const clearAllFilters = useCallback(() => {
    setExcludedTypes(new Set()); setExcludedApps(new Set()); setExcludedModes(new Set())
    setExcludedPaidBy(new Set()); setExcludedTags(new Set()); setExcludeOneTime(false)
  }, [])

  return (
    <div className="min-h-screen bg-base pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-surface border-b border-divider sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-ink flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-accent" />
              Expenses
            </span>
            <div className="flex items-center gap-0.5">
              <Link href={`/?month=${prevMonthStr}`} className="text-muted hover:text-ink w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 transition-colors text-lg">‹</Link>
              <span className="text-ink font-medium text-sm px-2 min-w-[110px] text-center">{monthLabel}</span>
              <Link href={`/?month=${nextMonthStr}`} className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${isCurrentMonth ? 'text-mutedDim/40 pointer-events-none' : 'text-muted hover:text-ink hover:bg-surface2'}`}>›</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/add" className="hidden md:flex items-center gap-1.5 bg-accent hover:bg-accent-2 text-base font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
              <PlusIcon className="w-4 h-4" /> Add Expense
            </Link>
            <span className="text-sm text-muted hidden md:block">{userName}</span>
            <SignOutButton />
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

      {/* Main layout: 2-col on desktop, single column on mobile */}
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-4 lg:items-start">

          {/* Left column: analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:sticky lg:top-[7.5rem]">
            <OverviewCard total={total} prevTotal={prevTotal} monthLabel={monthLabel} />
            <PaidByCard data={paidByData} />
            <CategoryCard data={categoryData} showComparison={showComparison} onToggleComparison={toggleComparison} />
            <DailyTrendCard data={trendData} />
          </div>

          {/* Right column: transaction list */}
          <div className="lg:h-[calc(100vh-7.5rem)]">
            <TransactionList
              expenses={sortedExpenses}
              totalCount={thisMonthExpenses.length}
              monthLabel={monthLabel}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortKeyChange={setSortKey}
              onSortDirChange={toggleSortDir}
              totalActiveFilters={totalActiveFilters}
            />
          </div>
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
