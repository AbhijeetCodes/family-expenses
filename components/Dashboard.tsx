'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, subMonths, addMonths } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import KpiCard from './KpiCard'
import CategoryPie from './charts/CategoryPie'
import CategoryCompare from './charts/CategoryCompare'
import DailyTrend from './charts/DailyTrend'
import PaidByBreakdown from './charts/PaidByBreakdown'
import SignOutButton from './SignOutButton'
import FilterDropdown from './FilterDropdown'

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
  // Filter state
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set())
  const [filterApps, setFilterApps] = useState<Set<string>>(new Set())
  const [filterModes, setFilterModes] = useState<Set<string>>(new Set())
  const [filterPaidBy, setFilterPaidBy] = useState<Set<string>>(new Set())
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [excludeOneTime, setExcludeOneTime] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview')
  const [showComparison, setShowComparison] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Options for each dropdown (unique values in current month)
  const allTypes   = useMemo(() => unique(thisMonthExpenses.map(e => e.expenseType)), [thisMonthExpenses])
  const allApps    = useMemo(() => unique(thisMonthExpenses.map(e => e.app)), [thisMonthExpenses])
  const allModes   = useMemo(() => unique(thisMonthExpenses.map(e => e.paymentMode)), [thisMonthExpenses])
  const allPaidBy  = useMemo(() => unique(thisMonthExpenses.map(e => e.paidBy)), [thisMonthExpenses])
  const allTags    = useMemo(() => unique(thisMonthExpenses.flatMap(e => e.tags)), [thisMonthExpenses])

  const totalActiveFilters =
    filterTypes.size + filterApps.size + filterModes.size + filterPaidBy.size + filterTags.size + (excludeOneTime ? 1 : 0)

  const applyFilters = (expenses: Expense[]) =>
    expenses.filter(e => {
      if (filterTypes.size  > 0 && !filterTypes.has(e.expenseType))               return false
      if (filterApps.size   > 0 && !filterApps.has(e.app))                        return false
      if (filterModes.size  > 0 && !filterModes.has(e.paymentMode))               return false
      if (filterPaidBy.size > 0 && !filterPaidBy.has(e.paidBy))                   return false
      if (filterTags.size   > 0 && !e.tags.some(t => filterTags.has(t)))          return false
      if (excludeOneTime && e.oneTime)                                             return false
      return true
    })

  const filtered     = useMemo(() => applyFilters(thisMonthExpenses), [thisMonthExpenses, filterTypes, filterApps, filterModes, filterPaidBy, filterTags, excludeOneTime])
  const filteredPrev = useMemo(() => applyFilters(prevMonthExpenses), [prevMonthExpenses, filterTypes, filterApps, filterModes, filterPaidBy, filterTags, excludeOneTime])

  const total     = filtered.reduce((s, e) => s + e.cost, 0)
  const prevTotal = filteredPrev.reduce((s, e) => s + e.cost, 0)

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
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, amount]) => ({ day, amount }))
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

  const monthDate    = new Date(`${monthStr}-01`)
  const prevMonthStr = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonthStr = format(addMonths(monthDate, 1), 'yyyy-MM')
  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM')

  function clearAllFilters() {
    setFilterTypes(new Set()); setFilterApps(new Set()); setFilterModes(new Set())
    setFilterPaidBy(new Set()); setFilterTags(new Set()); setExcludeOneTime(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-100">💰 Expenses</span>
            <div className="flex items-center gap-0.5">
              <Link href={`/?month=${prevMonthStr}`} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors text-lg">‹</Link>
              <span className="text-slate-200 font-medium text-sm px-2 min-w-[110px] text-center">{monthLabel}</span>
              <Link href={`/?month=${nextMonthStr}`} className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${isCurrentMonth ? 'text-slate-700 pointer-events-none' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>›</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/add" className="hidden md:flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-slate-900 font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
              + Add expense
            </Link>
            <span className="text-sm text-slate-500 hidden md:block">{userName}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-slate-800/60 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
          <FilterDropdown label="Type"    options={allTypes}  selected={filterTypes}  onChange={setFilterTypes} />
          <FilterDropdown label="Paid By" options={allPaidBy} selected={filterPaidBy} onChange={setFilterPaidBy} />
          <FilterDropdown label="App"     options={allApps}   selected={filterApps}   onChange={setFilterApps} />
          <FilterDropdown label="Mode"    options={allModes}  selected={filterModes}  onChange={setFilterModes} />
          <FilterDropdown label="Tags"    options={allTags}   selected={filterTags}   onChange={setFilterTags} />

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button
            onClick={() => setExcludeOneTime(!excludeOneTime)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
              ${excludeOneTime
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-slate-700 text-slate-500 border-slate-600 hover:text-slate-300 hover:bg-slate-600'}`}
          >
            {excludeOneTime ? '✕ 1-time excluded' : 'Exclude 1-time'}
          </button>

          {totalActiveFilters > 0 && (
            <>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button onClick={clearAllFilters} className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
                Clear all ({totalActiveFilters})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex border-b border-slate-700">
          {(['overview', 'transactions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px
                ${activeTab === tab ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              {tab === 'transactions'
                ? `Transactions (${sortedExpenses.length}${sortedExpenses.length !== thisMonthExpenses.length ? `/${thisMonthExpenses.length}` : ''})`
                : 'Overview'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <KpiCard total={total} prevTotal={prevTotal} month={monthLabel} />
            <div className="card">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Paid By</h2>
              <PaidByBreakdown data={paidByData} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">By Category</h2>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                    ${showComparison ? 'text-blue-400 border-blue-500/40 bg-blue-500/10' : 'text-slate-500 border-slate-600 hover:text-slate-300'}`}
                >
                  {showComparison ? '↕ vs last month' : 'vs last month'}
                </button>
              </div>
              {showComparison
                ? <CategoryCompare data={categoryData} />
                : <CategoryPie data={categoryData.map(d => ({ name: d.name, value: d.current }))} />}
            </div>
            <div className="card">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Daily Spending</h2>
              <DailyTrend data={trendData} />
            </div>
          </div>
        </div>
      )}

      {/* Transactions tab */}
      {activeTab === 'transactions' && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="card p-0 overflow-hidden">
            {/* Sort controls */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
              <span className="text-xs text-slate-500">
                {sortedExpenses.length} transaction{sortedExpenses.length !== 1 ? 's' : ''}
                {sortedExpenses.length !== thisMonthExpenses.length && (
                  <span className="text-slate-600"> of {thisMonthExpenses.length}</span>
                )}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">Sort</span>
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-xs py-1 px-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="date">Date</option>
                  <option value="cost">Amount</option>
                  <option value="name">Name</option>
                </select>
                <button
                  onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  className="text-slate-400 hover:text-slate-200 transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700"
                  title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
                >
                  {sortDir === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>

            {sortedExpenses.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-sm">
                {totalActiveFilters > 0 ? 'No transactions match the current filters.' : `No expenses for ${monthLabel}`}
              </p>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {sortedExpenses.map(e => (
                  <Link
                    key={e.rowIndex}
                    href={`/expenses/${e.rowIndex}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-700/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-100 truncate">{e.name}</p>
                        {e.oneTime && (
                          <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">1×</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {e.expenseType}{e.app ? ` · ${e.app}` : ''} · {e.date.slice(5).replace('-', '/')}
                        {e.paymentMode ? ` · ${e.paymentMode}` : ''}
                      </p>
                      {e.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {e.tags.map(t => <span key={t} className="text-xs bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm text-slate-100">₹{e.cost.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500">{e.paidBy}</p>
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-sm hidden md:block">Edit ›</span>
                      <span className="text-slate-600 group-hover:text-slate-400 transition-colors md:hidden">›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <Link
        href="/add"
        className="fixed bottom-20 right-4 md:hidden w-12 h-12 bg-green-500 text-slate-900 rounded-full
                   flex items-center justify-center text-2xl shadow-lg active:bg-green-400 z-30 font-light"
        aria-label="Add expense"
      >+</Link>
    </div>
  )
}
