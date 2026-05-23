import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns'
import KpiCard from '@/components/KpiCard'
import CategoryPie from '@/components/charts/CategoryPie'
import DailyTrend from '@/components/charts/DailyTrend'
import PaidByBreakdown from '@/components/charts/PaidByBreakdown'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { signOut } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function getMonthExpenses(expenses: Awaited<ReturnType<typeof getAllExpenses>>, monthStart: Date) {
  const interval = { start: startOfMonth(monthStart), end: endOfMonth(monthStart) }
  return expenses.filter(e => {
    if (!e.date) return false
    try { return isWithinInterval(parseISO(e.date), interval) } catch { return false }
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const all = await getAllExpenses()
  const now = new Date()
  const thisMonth = getMonthExpenses(all, now)
  const lastMonth = getMonthExpenses(all, subMonths(now, 1))

  const total = thisMonth.reduce((s, e) => s + e.cost, 0)
  const prevTotal = lastMonth.reduce((s, e) => s + e.cost, 0)

  // Pie data
  const byType: Record<string, number> = {}
  for (const e of thisMonth) {
    byType[e.expenseType || 'Other'] = (byType[e.expenseType || 'Other'] ?? 0) + e.cost
  }
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Daily trend
  const byDay: Record<string, number> = {}
  for (const e of thisMonth) {
    if (e.date) byDay[e.date] = (byDay[e.date] ?? 0) + e.cost
  }
  const trendData = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
    .map(([day, amount]) => ({ day, amount }))

  // Paid by
  const byPerson: Record<string, number> = {}
  for (const e of thisMonth) {
    const p = e.paidBy || '?'
    byPerson[p] = (byPerson[p] ?? 0) + e.cost
  }
  const paidByData = Object.entries(byPerson).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Recent 10
  const recent = [...thisMonth].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  const monthLabel = format(now, 'MMMM yyyy')

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="font-bold text-lg">💰 Expenses</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user?.name?.split(' ')[0]}</span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
            <button className="text-xs text-gray-400 underline">Sign out</button>
          </form>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* KPI */}
        <KpiCard total={total} prevTotal={prevTotal} month={monthLabel} />

        {/* Expense Type Breakdown */}
        <div className="card">
          <h2 className="font-semibold text-sm text-gray-600 mb-2">By Category</h2>
          <CategoryPie data={pieData} />
        </div>

        {/* Daily Trend */}
        <div className="card">
          <h2 className="font-semibold text-sm text-gray-600 mb-2">Daily Spending</h2>
          <DailyTrend data={trendData} />
        </div>

        {/* Paid By */}
        <div className="card">
          <h2 className="font-semibold text-sm text-gray-600 mb-2">Paid By</h2>
          <PaidByBreakdown data={paidByData} />
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-600">Recent</h2>
            <Link href="/expenses" className="text-xs text-brand-600 font-medium">See all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No expenses this month</p>
            )}
            {recent.map(e => (
              <Link
                key={e.rowIndex}
                href={`/expenses/${e.rowIndex}`}
                className="flex items-center justify-between py-3 gap-2 active:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.expenseType} · {e.date.slice(5).replace('-', '/')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">₹{e.cost.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400">{e.paidBy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/add"
        className="fixed bottom-20 right-4 w-14 h-14 bg-brand-600 text-white rounded-full
                   flex items-center justify-center text-2xl shadow-lg active:bg-brand-700 z-30"
        aria-label="Add expense"
      >
        +
      </Link>

      <BottomNav />
    </div>
  )
}
