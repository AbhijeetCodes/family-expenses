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
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { month } = await searchParams
  const monthStr = month ?? format(new Date(), 'yyyy-MM')
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
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link href={`/expenses?month=${prevMonth}`} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-slate-700 transition-colors">‹</Link>
          <h1 className="font-bold text-slate-100">{format(monthDate, 'MMMM yyyy')}</h1>
          <Link
            href={`/expenses?month=${nextMonth}`}
            className={`w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-colors
              ${isCurrentMonth ? 'text-slate-700 pointer-events-none' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >›</Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{filtered.length} expenses</span>
          <span className="font-bold text-green-400">
            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-500 text-sm">
            No expenses for {format(monthDate, 'MMMM yyyy')}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="divide-y divide-slate-700/50">
              {filtered.map(e => (
                <Link
                  key={e.rowIndex}
                  href={`/expenses/${e.rowIndex}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-700/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-100 truncate">{e.name}</p>
                      {e.oneTime && (
                        <span className="text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 font-medium">one-time</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {e.expenseType}{e.app ? ` · ${e.app}` : ''} · {e.date.slice(5).replace('-', '/')}
                    </p>
                    {e.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {e.tags.map(t => (
                          <span key={t} className="text-xs bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm text-slate-100">₹{e.cost.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-500">{e.paidBy}</p>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-400 transition-colors">›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
