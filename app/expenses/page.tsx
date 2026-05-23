import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval, parseISO } from 'date-fns'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const monthStr = (await searchParams).month ?? format(new Date(), 'yyyy-MM')
  const monthDate = new Date(`${monthStr}-01`)
  const interval = { start: startOfMonth(monthDate), end: endOfMonth(monthDate) }

  const all = await getAllExpenses()
  const filtered = all.filter(e => {
    if (!e.date) return false
    try { return isWithinInterval(parseISO(e.date), interval) } catch { return false }
  }).sort((a, b) => b.date.localeCompare(a.date))

  const total = filtered.reduce((s, e) => s + e.cost, 0)

  const prevMonth = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonth = format(addMonths(monthDate, 1), 'yyyy-MM')
  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM')

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link href={`/expenses?month=${prevMonth}`} className="text-gray-400 text-xl px-2">‹</Link>
          <h1 className="font-bold">{format(monthDate, 'MMMM yyyy')}</h1>
          <Link
            href={`/expenses?month=${nextMonth}`}
            className={`text-xl px-2 ${isCurrentMonth ? 'text-gray-200 pointer-events-none' : 'text-gray-400'}`}
          >›</Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Summary row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{filtered.length} expenses</span>
          <span className="font-bold text-brand-700">
            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-gray-400 text-sm">
            No expenses for {format(monthDate, 'MMMM yyyy')}
          </div>
        ) : (
          <div className="card divide-y divide-gray-50 p-0 overflow-hidden">
            {filtered.map(e => (
              <Link
                key={e.rowIndex}
                href={`/expenses/${e.rowIndex}`}
                className="flex items-center justify-between px-4 py-3 gap-2 active:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-gray-400">
                    {e.expenseType}{e.app ? ` · ${e.app}` : ''} · {e.date.slice(5).replace('-', '/')}
                    {e.oneTime ? ' · 1×' : ''}
                  </p>
                  {e.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {e.tags.map(t => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">₹{e.cost.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400">{e.paidBy}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
